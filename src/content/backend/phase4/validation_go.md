# Input Validation in Go: Never Trust User Input — Phase 4: Building Web Servers

In backend systems, you never fully trust what clients send. Input validation protects your services from malformed data, security breaches, and unpredictable behavior. Proper validation reduces bugs, prevents security flaws like injection attacks, and improves robustness in production. This lesson focuses on practical, production-ready input validation in Go for building web servers.

## 1. Input Validation Basics in a Go HTTP Server

This section introduces a simple HTTP handler that accepts JSON input and validates required fields manually. It demonstrates the core pattern: decode, validate, and respond with appropriate HTTP statuses and error messages.

```go
package main

import (
  "encoding/json"
  "net/http"
  "strings"
)

type UserInput struct {
  Name  string `json:"name"`
  Email string `json:"email"`
  Age   int    `json:"age"`
}

func main() {
  http.HandleFunc("/create", createUserHandler)
  http.ListenAndServe(":8080", nil)
}

func createUserHandler(w http.ResponseWriter, r *http.Request) {
  if r.Method != http.MethodPost {
    http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
    return
  }

  // Decode JSON body
  var input UserInput
  dec := json.NewDecoder(r.Body)
  if err := dec.Decode(&input); err != nil {
    http.Error(w, "invalid JSON body", http.StatusBadRequest)
    return
  }

  // Basic validation
  if strings.TrimSpace(input.Name) == "" {
    http.Error(w, "name is required", http.StatusBadRequest)
    return
  }
  if !isEmailValid(input.Email) {
    http.Error(w, "invalid email format", http.StatusBadRequest)
    return
  }
  if input.Age < 0 || input.Age > 130 {
    http.Error(w, "age must be between 0 and 130", http.StatusBadRequest)
    return
  }

  // If valid, simulate success
  w.WriteHeader(http.StatusCreated)
  w.Write([]byte(`{"status":"created"}`))
}

func isEmailValid(email string) bool {
  // Very simple email validity check (demo purposes)
  at := strings.Index(email, "@")
  dot := strings.LastIndex(email, ".")
  return at > 0 && dot > at
}
```

### Line-by-line explanation
- package main: defines the executable package.
- import ( ... ): imports needed packages for JSON decoding, HTTP, and string helpers.
- type UserInput struct: defines the expected JSON payload shape with json tags.
- func main(): sets up an HTTP server and routes to /create.
- http.HandleFunc("/create", createUserHandler): registers the handler.
- http.ListenAndServe(":8080", nil): starts the server on port 8080.
- func createUserHandler(...): HTTP handler for POST /create.
- if r.Method != http.MethodPost { ... }: ensures only POST requests are allowed.
- var input UserInput; dec := json.NewDecoder(r.Body); dec.Decode(&input): decodes the JSON payload into the struct.
- if err := dec.Decode(&input); err != nil { ... }: handles JSON decoding errors gracefully.
- if strings.TrimSpace(input.Name) == "": validates that name is present (non-empty after trimming).
- if !isEmailValid(input.Email): performs a basic email format check.
- if input.Age < 0 || input.Age > 130: validates age is within a realistic range.
- w.WriteHeader(http.StatusCreated); w.Write(...): sends a successful 201 response with a small JSON payload.
- func isEmailValid(email string) bool: a compact, simple validation helper to avoid obvious invalid emails.

## 2. Validating Different Input Types: Path, Query, and Headers

In real endpoints, you validate multiple input sources: path parameters, query parameters, and headers. This section shows how to validate each type safely in Go without leaning on any framework.

```go
package main

import (
  "fmt"
  "net/http"
  "strconv"
  "strings"
)

func main() {
  http.HandleFunc("/accounts/", accountHandler) // path: /accounts/{id}
  http.HandleFunc("/search", searchHandler)     // query: ?q=term&limit=10
  http.HandleFunc("/consume", headerHandler)    // header: X-Request-Id
  http.ListenAndServe(":8080", nil)
}

func accountHandler(w http.ResponseWriter, r *http.Request) {
  // Extract path param: /accounts/{id}
  parts := strings.Split(r.URL.Path, "/")
  if len(parts) < 3 || parts[1] != "accounts" {
    http.NotFound(w, r)
    return
  }
  idStr := parts[2]
  id, err := strconv.Atoi(idStr)
  if err != nil || id <= 0 {
    http.Error(w, "invalid account id", http.StatusBadRequest)
    return
  }

  // Dummy success response
  w.WriteHeader(http.StatusOK)
  fmt.Fprintf(w, `{"account_id": %d, "status": "ok"}`, id)
}

func searchHandler(w http.ResponseWriter, r *http.Request) {
  q := strings.TrimSpace(r.URL.Query().Get("q"))
  if q == "" {
    http.Error(w, "query parameter 'q' is required", http.StatusBadRequest)
    return
  }

  limitStr := r.URL.Query().Get("limit")
  limit := 20 // default
  if limitStr != "" {
    if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
      limit = l
    } else {
      http.Error(w, "invalid limit (1-100)", http.StatusBadRequest)
      return
    }
  }

  // Dummy search result
  w.WriteHeader(http.StatusOK)
  fmt.Fprintf(w, `{"query": "%s", "limit": %d, "results": []}`, q, limit)
}

func headerHandler(w http.ResponseWriter, r *http.Request) {
  reqID := r.Header.Get("X-Request-Id")
  if reqID == "" {
    http.Error(w, "missing X-Request-Id header", http.StatusBadRequest)
    return
  }

  // Basic length/format check
  if len(reqID) < 8 {
    http.Error(w, "invalid X-Request-Id", http.StatusBadRequest)
    return
  }

  w.WriteHeader(http.StatusOK)
  fmt.Fprintf(w, `{"request_id": "%s"}`, reqID)
}
```

### Line-by-line explanation
- package main: executable package.
- import (...): brings in packages for HTTP, string ops, parsing, and formatting.
- main(): registers three handlers for path, query, and header variations, then starts the server.
- accountHandler: extracts a path parameter from the URL, validates it as a positive integer, and responds.
- parts := strings.Split(r.URL.Path, "/"): splits the path by slashes to locate the id position.
- if len(parts) < 3 || parts[1] != "accounts": basic sanity check for routing pattern.
- idStr := parts[2]; id, err := strconv.Atoi(idStr): converts the path segment to an integer.
- if err != nil || id <= 0: validates that the id is a positive integer.
- searchHandler: validates query parameters q and limit with sane defaults and ranges.
- q := strings.TrimSpace(r.URL.Query().Get("q")): reads and trims the search term.
- limitStr := r.URL.Query().Get("limit"); limit := 20: reads limit with a default of 20.
- if limitStr != "" { ... }: validates limit is numeric and between 1 and 100.
- headerHandler: validates a required header X-Request-Id with basic checks.
- reqID := r.Header.Get("X-Request-Id"): fetches header value.
- if reqID == "": enforces presence of the header.
- w.WriteHeader(http.StatusOK): sends success; includes the request_id in the response.

## 3. Using Strong Validation Libraries: go-playground/validator

Go has popular validation libraries that centralize rules, messages, and error handling. This section demonstrates how to use go-playground/validator/v10 to declare constraints declaratively and validate a request struct.

```go
package main

import (
  "encoding/json"
  "net/http"

  "github.com/go-playground/validator/v10"
)

type UserInput struct {
  Name     string `json:"name" validate:"required,min=2,max=50,alphanum"`
  Email    string `json:"email" validate:"required,email"`
  Password string `json:"password" validate:"required,min=8"`
  Age      int    `json:"age" validate:"gte=0,lte=130"`
}

var validate = validator.New()

func main() {
  http.HandleFunc("/validated-create", validatedCreateHandler)
  http.ListenAndServe(":8080", nil)
}

func validatedCreateHandler(w http.ResponseWriter, r *http.Request) {
  if r.Method != http.MethodPost {
    http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
    return
  }

  var input UserInput
  dec := json.NewDecoder(r.Body)
  if err := dec.Decode(&input); err != nil {
    http.Error(w, "invalid JSON body", http.StatusBadRequest)
    return
  }

  // Validate with struct tags
  if err := validate.Struct(input); err != nil {
    // Build a succinct error response
    w.WriteHeader(http.StatusBadRequest)
    json.NewEncoder(w).Encode(map[string]interface{}{
      "error": "validation failed",
      "details": err.Error(),
    })
    return
  }

  w.WriteHeader(http.StatusCreated)
  w.Write([]byte(`{"status":"created"}`))
}
```

### Line-by-line explanation
- package main: executable package.
- import (...): brings in JSON, HTTP, and the validator package.
- type UserInput struct: defines fields with both JSON tags and validation tags (required, length, format, etc.).
- var validate = validator.New(): initializes a global validator instance.
- main(): registers the route and starts the server.
- validatedCreateHandler: HTTP handler for validated creation.
- if r.Method != http.MethodPost: ensures only POST requests.
- var input UserInput; dec := json.NewDecoder(r.Body); dec.Decode(&input): decodes the request body into the struct.
- if err := dec.Decode(&input); err != nil { ... }: handles JSON decoding errors.
- if err := validate.Struct(input); err != nil { ... }: runs the validation rules defined by tags.
- w.WriteHeader(http.StatusBadRequest); json.NewEncoder(w).Encode(...): returns a structured error payload on validation failure.
- w.WriteHeader(http.StatusCreated); w.Write([]byte(`{"status":"created"}`)): indicates success if validation passes.

## 4. Defensive Techniques and Security: Sanitize, Parameterize, and Fail-Fast

This section contrasts unsafe patterns with robust, secure patterns across database access and JSON handling. It emphasizes defense-in-depth: validate early, use parameterized queries, and fail fast with meaningful errors.

```go
package main

import (
  "database/sql"
  "encoding/json"
  "fmt"
  "net/http"

  _ "github.com/go-sql-driver/mysql" // or your driver of choice
)

type NewUser struct {
  Name  string `json:"name"`
  Email string `json:"email"`
}

func main() {
  http.HandleFunc("/register", registerHandler)
  http.ListenAndServe(":8080", nil)
}

func registerHandler(w http.ResponseWriter, r *http.Request) {
  if r.Method != http.MethodPost {
    http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
    return
  }

  var user NewUser
  Dec := json.NewDecoder(r.Body)
  if err := Dec.Decode(&user); err != nil {
    http.Error(w, "invalid JSON", http.StatusBadRequest)
    return
  }

  // BAD: string concatenation leads to SQL injection risk
  // badStmt := fmt.Sprintf("INSERT INTO users (name, email) VALUES ('%s','%s')", user.Name, user.Email)
  // db.Exec(badStmt)

  // GOOD: parameterized query
  db, err := sql.Open("mysql", "user:password@tcp(localhost:3306)/db")
  if err != nil {
    http.Error(w, "db error", http.StatusInternalServerError)
    return
  }
  defer db.Close()

  _, err = db.Exec("INSERT INTO users (name, email) VALUES (?, ?)", user.Name, user.Email)
  if err != nil {
    http.Error(w, "db insert failed", http.StatusInternalServerError)
    return
  }

  w.WriteHeader(http.StatusCreated)
  w.Write([]byte(`{"status":"registered"}`))
}
```

### Line-by-line explanation
- package main: executable package.
- import (...): includes database/sql, JSON handling, HTTP, and the MySQL driver import (or alternative driver).
- type NewUser struct: minimal input for registration.
- main(): sets up the /register route and starts the server.
- registerHandler: handles POST /register with proper validation and DB interaction.
- if r.Method != http.MethodPost: enforces the HTTP method.
- var user NewUser; Dec.Decode(&user): decodes input JSON into the struct.
- BAD pattern (commented): demonstrates how string concatenation could lead to SQL injection.
- GOOD pattern: uses a parameterized query with placeholders.
- _, err = db.Exec("INSERT INTO users (name, email) VALUES (?, ?)", user.Name, user.Email): safely passes user-supplied data to the DB layer.
- Error handling: returns 500 on DB errors or success on 201.

Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

1) SQL injection risk
- Bad:
```go
name := "alice"; email := "alice@example.com"
stmt := "INSERT INTO users (name, email) VALUES ('" + name + "', '" + email + "')"
db.Exec(stmt)
```
- Good:
```go
name := "alice"; email := "alice@example.com"
db.Exec("INSERT INTO users (name, email) VALUES (?, ?)", name, email)
```

2) Allowing unknown fields in JSON (overfitting the input)
- Bad:
```go
type User struct {
  Name  string `json:"name"`
  Email string `json:"email"`
}
var u User
json.NewDecoder(r.Body).Decode(&u) // ignores extra fields
```
- Good:
```go
decoder := json.NewDecoder(r.Body)
decoder.DisallowUnknownFields()
var u User
if err := decoder.Decode(&u); err != nil {
  // handle error: unknown field or invalid JSON
}
```

3) Skipping validation or using weak checks
- Bad:
```go
var input struct {
  Username string `json:"username"`
  Age      int    `json:"age"`
}
json.NewDecoder(r.Body).Decode(&input)
// no validation on username length or age range
```
- Good:
```go
type UserInput struct {
  Username string `json:"username" validate:"required,min=3,max=20,alphanum"`
  Age      int    `json:"age" validate:"gte=0,lte=120"`
}
validate := validator.New()
if err := validate.Struct(input); err != nil {
  // return detailed validation error response
}
```

4) Improper or missing error handling and status codes
- Bad:
```go
http.Error(w, "error", http.StatusOK) // incorrect status
```
- Good:
```go
http.Error(w, "invalid input", http.StatusBadRequest)
```

Why This Matters In Real Systems

- Security: Prevent injection attacks, such as SQL injection, by always using parameterized queries and strict input schemas.
- Data integrity: Maintain consistent data by validating types, ranges, formats, and required fields before persisting.
- Reliability: Fail-fast on invalid input to avoid downstream errors, crashes, or corrupted state.
- Compliance and auditing: Clear, consistent error messaging and input validation help with audits and incident response.
- Developer productivity: Centralized validation reduces boilerplate code and makes behavior predictable across endpoints.

Study Questions

1. What is the difference between validating input manually and using a validation library in Go?
2. Why should you use parameterized queries instead of string concatenation when interacting with a database?
3. How can json.Decoder.DisallowUnknownFields() help improve security and data integrity?
4. What are some common input sources you should validate in a web server (path params, query params, headers, and body)?
5. How would you design error responses to avoid leaking sensitive internal information while still helping clients fix their requests?

Exercise

Part A: Build a small HTTP server with a POST /register endpoint
- Task: Implement an endpoint that accepts JSON with fields: username, email, password, and age.
- Validation rules:
  - username: required, 3–20 characters, alphanumeric.
  - email: required, valid email format.
  - password: required, at least 8 characters, must include a number.
  - age: optional; if provided, must be between 13 and 120.
  - No extra unknown fields are allowed in the JSON payload.
- Response:
  - 201 Created on success with {"status":"registered"}.
  - 400 Bad Request with a concise error detail on any validation failure.
- Implementation notes:
  - Use go-playground/validator/v10 for declarative validation in Part B (optional but encouraged).
  - Use json.Decoder with DisallowUnknownFields to prevent extra fields.
  - Return meaningful error messages without exposing internal server state.

Part B: Optional extension (for deeper practice)
- Add a mock in-memory store to persist registered users (no real DB required).
- Implement a simple test that asserts:
  - Valid input passes validation and returns 201.
  - Invalid input (e.g., missing email) returns 400.
  - Unknown field in the payload returns 400.

Part C: Write small unit tests
- Test the input validation logic independently of HTTP, using the struct and validator.
- Test the JSON decoding with unknown fields to ensure it fails when present.

Additional Implementation Hints
- If you choose to use validator/v10, add to go.mod:
  - github.com/go-playground/validator/v10 v10.x.x
- When testing, consider table-driven tests for various input permutations.
- For production-readiness, you would wrap validation errors in a consistent error payload format and tie it to a structured error type.

This lesson equips you with practical patterns to validate all inputs in a Go-based web server, aligning with real-world backend engineering practices.