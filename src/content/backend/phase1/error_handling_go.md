# Backend Engineering — Phase 1: Language Foundations — Error Handling & Debugging in Go

Error handling and debugging are foundational skills for any backend engineer. In Go, errors are explicit values that travel through your call stack, so writing clear, contextual, and recoverable error paths is essential for reliability, observability, and maintainability in production systems. This lesson gives you practical patterns for modeling errors, wrapping context, detecting sentinel errors, and debugging issues efficiently in Go services.

## 1. Error Handling Semantics in Go

Go treats errors as values. This section covers sentinel errors, wrapping with context, and inspecting errors with errors.Is and errors.As.

### Code Block 1: Basic error return
```go
package main

import (
	"errors"
	"fmt"
)

func divide(a, b int) (int, error) {
	if b == 0 {
		return 0, errors.New("division by zero")
	}
	return a / b, nil
}

func main() {
	if v, err := divide(10, 0); err != nil {
		fmt.Println("error:", err)
	} else {
		fmt.Println("result:", v)
	}
}
```
### Line-by-line explanation
- package main: declares the main package.
- import block: brings in the errors and fmt packages used for error creation and output.
- func divide(a, b int) (int, error): defines a function that returns either the quotient or an error.
- if b == 0 { return 0, errors.New("division by zero") }: checks for an invalid divisor and returns a new error value.
- return a / b, nil: returns the computed quotient when no error occurs.
- func main() { ... }: entry point of the program.
- if v, err := divide(10, 0); err != nil { ... }: calls divide and handles the error path.
- fmt.Println("error:", err): prints the error when one occurs.
- else { fmt.Println("result:", v) }: prints the successful result otherwise.

### Code Block 2: Wrapping errors with context
```go
package main

import (
	"errors"
	"fmt"
)

var ErrNotFound = errors.New("not found")

func findResource(id int) (string, error) {
	if id == 0 {
		return "", ErrNotFound
	}
	return fmt.Sprintf("resource-%d", id), nil
}

func getResource(id int) (string, error) {
	if r, err := findResource(id); err != nil {
		return "", fmt.Errorf("failed to get resource %d: %w", id, err)
	} else {
		return r, nil
	}
}

func main() {
	if r, err := getResource(0); err != nil {
		fmt.Println("error:", err)
		// ErrNotFound is wrapped; downstream can inspect with errors.Is
	} else {
		fmt.Println("resource:", r)
	}
}
```
### Line-by-line explanation
- var ErrNotFound = errors.New("not found"): defines a sentinel error for not-found cases.
- func findResource(id int) (string, error): looks up a resource by ID.
- if id == 0 { return "", ErrNotFound }: returns the sentinel error when not found.
- return fmt.Sprintf("resource-%d", id), nil: returns a valid resource string otherwise.
- func getResource(id int) (string, error): wraps the lower-level error with context.
- if r, err := findResource(id); err != nil { return "", fmt.Errorf("failed to get resource %d: %w", id, err) }: wraps the error with additional context using %w.
- else { return r, nil }: returns the resource when no error occurs.
- func main() { ... }: main program.
- if r, err := getResource(0); err != nil { fmt.Println("error:", err) }: handles the wrapped error path.
- else { fmt.Println("resource:", r) }: prints the validated resource.

### Code Block 3: errors.Is and errors.As usage
```go
package main

import (
	"errors"
	"fmt"
)

var ErrNotFound = errors.New("not found")

type NotFoundError struct {
	ID int
}

func (e *NotFoundError) Error() string {
	return fmt.Sprintf("resource %d: not found", e.ID)
}

func load(id int) (string, error) {
	if id == 0 {
		return "", ErrNotFound
	}
	if id < 0 {
		return "", &NotFoundError{ID: id}
	}
	return fmt.Sprintf("resource-%d", id), nil
}

func main() {
	// Case 1: sentinel error with errors.Is
	if _, err := load(0); err != nil {
		if errors.Is(err, ErrNotFound) {
			fmt.Println("Detected sentinel not found via errors.Is")
		}
	}

	// Case 2: custom error type with errors.As
	if res, err := load(-7); err != nil {
		var nf *NotFoundError
		if errors.As(err, &nf) {
			fmt.Printf("Detected NotFoundError with ID=%d\n", nf.ID)
			_ = res // not used in this example
		}
	}
}
```
### Line-by-line explanation
- type NotFoundError struct { ID int }: defines a custom error type for more detail.
- func (e *NotFoundError) Error() string: implements the error interface for NotFoundError.
- func load(id int) (string, error): returns either sentinel or custom errors.
- if id == 0 { return "", ErrNotFound }: sentinel path.
- if id < 0 { return "", &NotFoundError{ID: id} }: wrapped/custom error path.
- func main() { ... }: drive the demonstration.
- errors.Is(err, ErrNotFound): checks for the sentinel error in a wrapped error.
- errors.As(err, &nf): extracts the NotFoundError type from a wrapped error.

## 2. Debugging Techniques in Go

This section introduces practical debugging patterns: catching panics safely, capturing stack traces, and predictable resource handling to aid debugging in production.

### Code Block 4: Panic and recover (turn panics into errors)
```go
package main

import (
	"fmt"
)

func mayPanic(i int) int {
	if i == 0 {
		panic("division by zero panic")
	}
	return 100 / i
}

func safeCall(i int) (ret int, err error) {
	defer func() {
		if r := recover(); r != nil {
			// convert panic to error for the caller
			err = fmt.Errorf("panic recovered: %v", r)
		}
	}()
	return mayPanic(i), nil
}

func main() {
	if v, err := safeCall(0); err != nil {
		fmt.Println("error:", err)
	} else {
		fmt.Println("value:", v)
	}
}
```
### Line-by-line explanation
- mayPanic(i int) int: panics when i == 0 to simulate an unexpected failure.
- if i == 0 { panic("division by zero panic") }: triggers a panic with a message.
- return 100 / i: executes normally for non-zero i.
- safeCall(i int) (ret int, err error): wraps mayPanic with a recover block.
- defer func() { if r := recover(); r != nil { err = fmt.Errorf("panic recovered: %v", r) } }(): captures a panic and converts it to a regular error return.
- return mayPanic(i), nil: attempts to call mayPanic and return its result.
- main(): runs the safeCall and prints either the value or the recovered error.

### Code Block 5: Printing stack traces for debugging
```go
package main

import (
	"errors"
	"fmt"
	"runtime/debug"
)

func doWork(flag bool) error {
	if flag {
		return errors.New("operation failed")
	}
	return nil
}

func main() {
	if err := doWork(true); err != nil {
		fmt.Println("error:", err)
		// Print a stack trace for easier debugging in prod
		fmt.Println("stack trace:")
		fmt.Println(string(debug.Stack()))
	}
}
```
### Line-by-line explanation
- doWork(flag bool) error: simulates an operation that can fail.
- if flag { return errors.New("operation failed") }: returns an error on failure.
- main(): invokes doWork with a failing condition.
- if err != nil { ... }: handles the error path.
- fmt.Println("stack trace:"); fmt.Println(string(debug.Stack())): prints a runtime stack trace to diagnose where the failure occurred.

### Code Block 6: Basic resource management and debugging (defer)
```go
package main

import (
	"fmt"
	"os"
)

func readFirstLine(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	// Ensure the file is closed
	defer f.Close()

	buf := make([]byte, 128)
	n, err := f.Read(buf)
	if err != nil {
		return "", err
	}
	return string(buf[:n]), nil
}

func main() {
	line, err := readFirstLine("nonexistent.txt")
	if err != nil {
		fmt.Println("read error:", err)
		return
	}
	fmt.Println("first line:", line)
}
```
### Line-by-line explanation
- os.Open(path): opens a file handle for reading.
- if err != nil { return "", err }: propagates the error if the file cannot be opened.
- defer f.Close(): ensures the file is closed even if subsequent operations fail.
- f.Read(buf): reads up to 128 bytes from the file.
- string(buf[:n]): converts the read bytes to a string.
- main(): demonstrates error propagation and debugging output for a missing file.

## X. Common Beginner Mistakes

Pitfalls and practical fixes that frequently trip new Go backend developers.

### Pitfall 1: Ignoring errors
Bad:
```go
package main

import "fmt"

func Save(data string) error { return fmt.Errorf("db error") }

func main() {
	Save("data") // error value is ignored
	fmt.Println("continue")
}
```
Good:
```go
package main

import "fmt"

func Save(data string) error { return fmt.Errorf("db error") }

func main() {
	if err := Save("data"); err != nil {
		fmt.Println("save failed:", err)
		return
	}
	fmt.Println("save succeeded")
}
```

### Pitfall 2: Not wrapping errors or losing context
Bad:
```go
package main

import "errors"

func load() error {
	return errors.New("load failed")
}

func main() {
	_ = load() // no context about failure
}
```
Good:
```go
package main

import (
	"errors"
	"fmt"
)

func load() error {
	return errors.New("load failed")
}

func main() {
	if err := load(); err != nil {
		fmt.Printf("load() error: %w\n", err)
	}
}
```

### Pitfall 3: Using panic for control flow
Bad:
```go
package main

func GetItem(i int) int {
	if i < 0 {
		panic("negative index")
	}
	return i
}
```
Good:
```go
package main

import "fmt"

func GetItem(i int) (int, error) {
	if i < 0 {
		return 0, fmt.Errorf("invalid index: %d", i)
	}
	return i, nil
}
```

### Pitfall 4: Not closing resources (defer) when opening files
Bad:
```go
package main

import "os"

func main() {
	f, _ := os.Open("config.json")
	// forgot to defer f.Close()
	_ = f
}
```
Good:
```go
package main

import (
	"fmt"
	"os"
)

func main() {
	f, err := os.Open("config.json")
	if err != nil {
		fmt.Println("open error:", err)
		return
	}
	defer f.Close()
	// read or process f
}
```

## Y. Why This Matters In Real Systems

- Reliability: Clear error semantics prevent silent failures and cascading issues.
- Observability: Wrapping context with errors.Is/As preserves meaning across service boundaries and during propagation.
- Debuggability: Panics should be rare; when they occur, recover patterns and stack traces help identify root causes quickly, especially in production.
- Resilience: Proper resource management (defer Close, cancellation via context) reduces leaks and improves stability under load.
- Maintainability: Consistent error handling improves readability and supports tooling (tests, dashboards, and incident response).

In real systems, you should:
- Propagate context with meaningful messages and preserve error chains.
- Avoid leaking internal details to clients; return user-friendly errors while logging the root cause internally.
- Use structured logging with error metadata and optional stack traces during critical failures.
- Implement a centralized error policy: when to retry, when to escalate, and when to fail fast.

## Z. Study Questions

1. What is the difference between a sentinel error and a wrapped error in Go?
2. How does errors.Is help you detect a specific error even when it is wrapped?
3. When would you prefer using recover and panic vs. returning an error?
4. Why is it important to add context when wrapping errors (e.g., using fmt.Errorf("%w"))?
5. How can you obtain a stack trace in Go at runtime for debugging purposes?

## Exercise

Build a small error-aware utility and a driver that demonstrates practical error handling and debugging patterns.

Part A: Create a mini “config loader” with wrapped errors
- Implement a function loadConfig(path string) (Config, error) that:
  - Reads a JSON file from disk.
  - Returns a Config struct (define a simple struct with a few fields).
  - If the file does not exist, return ErrConfigNotFound sentinel error.
  - If the JSON is invalid, return an error wrapped with context using fmt.Errorf("%w", ...).
- Expose a sentinel error var ErrConfigNotFound.

Part B: Add custom error type with additional context
- Create a custom error type ConfigError struct { Path string; Err error } with an Error() string method.
- In loadConfig, if the JSON is invalid, return &ConfigError{Path: path, Err: err} and ensure you can extract the underlying error with errors.As.

Part C: Driver demonstrating error handling, wrapping, and stack trace
- Write a main.go that:
  - Calls loadConfig with both an existing path and a missing path.
  - Uses errors.Is to detect ErrConfigNotFound and prints a friendly message.
  - Uses errors.As to extract a *ConfigError and prints Path and underlying error.
  - On a production-like flag (for example, -stack), prints a stack trace using runtime/debug.Stack() when an error occurs.
- Ensure you import necessary packages and provide minimal, runnable code.

Notes for the exercise:
- Keep the JSON structure simple; you can use a struct like type Config struct { DBURL string; Port int }.
- Include clear comments explaining the error flow and how you would test it.
- You do not need to implement actual file writing—only reading/wrapping logic.