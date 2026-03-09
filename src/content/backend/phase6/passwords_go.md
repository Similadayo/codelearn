# Password Hashing with bcrypt in Go

Password hashing is foundational to secure authentication in backend systems. bcrypt provides a strong, adaptive hashing algorithm that automatically handles salting and allows you to tune the computational cost to balance security and performance. In real-world Go services, bcrypt is the standard choice for securely storing passwords and verifying user credentials, preventing attackers from recovering plain-text passwords even if the database is compromised.

## 1. Hashing Passwords with bcrypt in Go

Hashing is the process of turning a plain-text password into a fixed-length, non-reversible string. bcrypt also salts the hash automatically and uses a configurable cost factor to control CPU work. This section shows how to generate a bcrypt hash in Go, including reading a cost parameter from the environment for flexibility in different deployment environments.

Code example:
```go
package main

import (
  "fmt"
  "os"
  "strconv"

  "golang.org/x/crypto/bcrypt"
)

// getCost reads BCRYPT_COST from the environment (if set) and validates it.
// It returns a valid cost value in the range [4, 31], defaulting to 12.
func getCost() int {
  defaultCost := 12
  if v := os.Getenv("BCRYPT_COST"); v != "" {
    if i, err := strconv.Atoi(v); err == nil {
      if i >= 4 && i <= 31 {
        return i
      }
    }
  }
  return defaultCost
}

// HashPassword returns a bcrypt hash for the provided password using a configurable cost.
func HashPassword(password string) (string, error) {
  cost := getCost()
  hash, err := bcrypt.GenerateFromPassword([]byte(password), cost)
  if err != nil {
    return "", err
  }
  return string(hash), nil
}

func main() {
  password := "s3cr3tP@ssw0rd"
  hash, err := HashPassword(password)
  if err != nil {
    fmt.Println("Error hashing password:", err)
    return
  }
  fmt.Println("Hashed password:", hash)
}
```

### Line-by-line explanation
- `package main` — declares the executable package.
- `import (...)` — imports fmt for output, os and strconv for environment handling, and bcrypt for hashing.
- `func getCost() int` — helper that reads BCRYPT_COST, validates, and returns a safe cost; defaults to 12.
- `defaultCost := 12` — base security level if no env var is set.
- `if v := os.Getenv("BCRYPT_COST"); v != "" { ... }` — checks for an override in the environment.
- `strconv.Atoi(v)` — attempts to parse the string as an integer.
- `if i >= 4 && i <= 31` — bcrypt cost must be in this valid range.
- `return i` — uses the validated environment value.
- `return defaultCost` — falls back to the default cost when no valid env var is provided.
- `func HashPassword(password string) (string, error)` — hashes the given password with a configurable cost.
- `cost := getCost()` — obtains the cost to use.
- `bcrypt.GenerateFromPassword([]byte(password), cost)` — performs the bcrypt hashing; salts are generated internally.
- `if err != nil { return "", err }` — propagate errors to the caller.
- `return string(hash), nil` — returns the hashed password as a string.
- `func main()` — example usage: hashes a sample password and prints it.
- `hash, err := HashPassword(password)` — calls the hashing function.
- `fmt.Println("Hashed password:", hash)` — outputs the resulting hash.

## 2. Verifying Passwords with bcrypt

Verifying a password means comparing a plain-text input against a stored bcrypt hash. bcrypt.CompareHashAndPassword is the standard, constant-time verification function. It handles the salt and cost embedded in the hash, returning nil if the password matches.

Code example:
```go
package main

import (
  "fmt"
  "log"

  "golang.org/x/crypto/bcrypt"
)

// CheckPasswordHash compares a plain-text password with a bcrypt hash.
// It returns true if the password matches the hash.
func CheckPasswordHash(password, hash string) bool {
  err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
  return err == nil
}

func main() {
  password := "s3cr3tP@ssw0rd"

  // For demonstration, generate a hash first (in production, you would fetch the stored hash)
  hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
  if err != nil {
    log.Fatal("failed to generate hash:", err)
  }

  // Positive check
  fmt.Println("Password matches (expected):", CheckPasswordHash(password, string(hash)))

  // Negative check
  fmt.Println("Password matches (wrong):", CheckPasswordHash("wrong-password", string(hash)))
}
```

### Line-by-line explanation
- `package main` — executable package.
- `import (...)` — imports fmt for output, log for fatal errors, and bcrypt for verification.
- `func CheckPasswordHash(password, hash string) bool` — verifies a password against its bcrypt hash.
- `bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))` — runs the comparison; the hash contains the salt and cost.
- `return err == nil` — returns true when the password is correct.
- `func main()` — demonstration of hashing a password and verifying it.
- `hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)` — creates a hash with a cost of 12 (for demonstration).
- `CheckPasswordHash(password, string(hash))` — verifies the correct password.
- `CheckPasswordHash("wrong-password", string(hash))` — demonstrates a failed verification.

## 3. Practical patterns: Sign-up + Login Flows

In real applications, bcrypt is used as part of a user sign-up flow (hashing and storing the password) and a login flow (verifying the password against the stored hash). This example demonstrates a compact in-memory user store with SignUp and Authenticate methods, keeping the logic self-contained for learning.

Code example:
```go
package main

import (
  "fmt"
  "log"

  "golang.org/x/crypto/bcrypt"
)

type User struct {
  Username     string
  PasswordHash string
}

type UserStore struct {
  users map[string]User
}

func NewUserStore() *UserStore {
  return &UserStore{users: make(map[string]User)}
}

// SignUp hashes the password and stores the user.
func (s *UserStore) SignUp(username, password string) error {
  hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
  if err != nil {
    return err
  }
  s.users[username] = User{Username: username, PasswordHash: string(hash)}
  return nil
}

// Authenticate checks the provided password against the stored hash.
func (s *UserStore) Authenticate(username, password string) bool {
  user, ok := s.users[username]
  if !ok {
    return false
  }
  err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
  return err == nil
}

func main() {
  store := NewUserStore()

  if err := store.SignUp("alice", "s3cr3t!"); err != nil {
    log.Fatal("signup failed:", err)
  }

  fmt.Println("Login successful:", store.Authenticate("alice", "s3cr3t!"))
  fmt.Println("Login failed (wrong pass):", store.Authenticate("alice", "wrong-pass"))
}
```

### Line-by-line explanation
- `type User struct { ... }` — simple user model with a username and a bcrypt-stored hash.
- `type UserStore struct { users map[string]User }` — in-memory user registry.
- `NewUserStore() *UserStore` — constructor that initializes the map.
- `SignUp(username, password string) error` — hashes the password and stores the user with the resulting hash.
- `bcrypt.GenerateFromPassword([]byte(password), 12)` — hashes with a cost of 12.
- `s.users[username] = User{ Username: username, PasswordHash: string(hash) }` — stores the hash as a string (safe for storage in DB).
- `Authenticate(username, password string) bool` — fetches the user and verifies the password.
- `bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))` — verifies against the stored hash.
- `main()` — demonstrates sign-up and authentication flows.

## X. Common Beginner Mistakes

Pitfalls followed by bad vs good alternatives.

1) Pitfall: Using a too-low cost (weak protection)
- Bad:
```go
// Bad: cost = 4
hash, err := bcrypt.GenerateFromPassword([]byte("password"), 4)
```
- Good:
```go
// Good: cost in a secure range (12+)
hash, err := bcrypt.GenerateFromPassword([]byte("password"), 12)
```

2) Pitfall: Ignoring errors from hashing
- Bad:
```go
// Bad: ignoring error
hash := bcrypt.GenerateFromPassword([]byte("password"), 12)
```
- Good:
```go
hash, err := bcrypt.GenerateFromPassword([]byte("password"), 12)
if err != nil {
  // handle error (log, return, etc.)
}
```

3) Pitfall: Manually re-implementing hashing or using insecure alternatives
- Bad:
```go
// Bad: using a fast hash (insecure) and ignoring salt
hash := sha256.Sum256([]byte("password" + pepper))
```
- Good:
```go
// Good: use bcrypt to handle salting and adaptive cost
hash, err := bcrypt.GenerateFromPassword([]byte("password"), 12)
```

4) Pitfall: Improper verification (comparing hashes incorrectly)
- Bad:
```go
// Bad: direct string compare (timing-safe failure)
isMatch := string(hash) == storedHash
```
- Good:
```go
err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(password))
isMatch := err == nil
```

5) Pitfall: Storing only part of the hash or truncating data
- Bad:
```go
// Bad: storing only a prefix of the hash
store = string(hash)[:16]
```
- Good:
```go
// Good: store the full bcrypt hash string
store = string(hash)
```

## Y. Why This Matters In Real Systems

- Security posture: bcrypt is a purpose-built password-hashing algorithm that includes an adaptive cost factor, making brute-force attacks expensive as hardware improves.
- Salting handled automatically: Each password gets a unique salt embedded in the hash; you never need to manage salts separately.
- Performance and cost tuning: As CPU power grows, you can increase the cost factor to maintain security without breaking user experience.
- Operational practices: Store full hashes, rotate costs via environment config, monitor login failures, and implement rate limiting and account lockouts to mitigate brute-force attempts.
- Real-world integration: bcrypt fits naturally in sign-up and login flows, and it interoperates with typical persistence layers (databases, caches) without exposing plain-text passwords.

## Z. Study Questions

1) What does bcrypt.GenerateFromPassword do with the password and the cost parameter?
2) How does bcrypt store and use salting for each password hash?
3) Why is it important to adjust the cost factor over time?
4) What function should you use to verify a password against its stored hash?
5) Name two common mistakes when integrating bcrypt into a sign-up/login flow.

## Exercise

Goal: Build a small, self-contained password-auth module and a tiny in-memory user store to demonstrate sign-up and login using bcrypt in Go. Deliverables: a single Go file or a small package with the following.

Part 1 — Implement a password utility
- Create a function HashPassword(password string) (string, error) that hashes the password using bcrypt with a configurable cost (read from BCRYPT_COST or default to 12).
- Create a function CheckPasswordHash(password, hash string) bool that verifies a password against a bcrypt hash.

Part 2 — Implement a simple in-memory user store
- Create a User struct { Username string; PasswordHash string } and a UserStore with a map[string]User.
- Implement SignUp(username, password string) error: hash the password and store the user.
- Implement Authenticate(username, password string) bool: verify the provided password against the stored hash.

Part 3 — Demonstration
- Write a main function that signs up a user, then attempts a successful login and a failed login, printing the outcomes.

Part 4 — Extension (optional)
- Extend HashPassword to read BCRYPT_COST from the environment and fall back to 12 if not set or invalid.
- Add unit tests that cover SignUp + Authenticate success and failure scenarios.

Example scaffold to guide your implementation (adjust package structure as needed):
```go
package main

import (
  "fmt"
  "log"

  "golang.org/x/crypto/bcrypt"
)

type User struct {
  Username     string
  PasswordHash string
}

type UserStore struct {
  users map[string]User
}

func NewUserStore() *UserStore {
  return &UserStore{users: make(map[string]User)}
}

func HashPassword(password string) (string, error) {
  // Cost 12 as a sensible default; you can wire cost from env later if you want
  hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
  if err != nil {
    return "", err
  }
  return string(hash), nil
}

func CheckPasswordHash(password, hash string) bool {
  err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
  return err == nil
}

func (s *UserStore) SignUp(username, password string) error {
  hash, err := HashPassword(password)
  if err != nil {
    return err
  }
  s.users[username] = User{Username: username, PasswordHash: hash}
  return nil
}

func (s *UserStore) Authenticate(username, password string) bool {
  user, ok := s.users[username]
  if !ok {
    return false
  }
  return CheckPasswordHash(password, user.PasswordHash)
}

func main() {
  store := NewUserStore()

  if err := store.SignUp("alice", "s3cr3t!"); err != nil {
    log.Fatal("signup failed:", err)
  }

  fmt.Println("Login success (correct password):", store.Authenticate("alice", "s3cr3t!"))
  fmt.Println("Login failure (wrong password):", store.Authenticate("alice", "wrong-pass"))
}
```

This lesson provides a practical, production-minded approach to password hashing with bcrypt in Go, including hashing, verification, in-memory user flow, common mistakes, real-world considerations, and hands-on exercises.