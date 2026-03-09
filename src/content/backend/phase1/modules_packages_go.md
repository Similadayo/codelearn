# Track: Backend Engineering — Module: Phase 1 — Language Foundations — Topic: Modules, Packages & Dependency Management (Go)

Go modules and packages are the backbone of modern Go backends. They provide predictable builds, clear dependency graphs, and scalable collaboration across teams. This lesson walks through how Go organizes code into packages, how modules pin and fetch dependencies, and how to manage versions safely in production systems.

## 1. Go Modules and Packages: Basics

This section covers the primary building blocks: packages, modules, and how to wire them together in a small project. You’ll see a simple module with one internal package and a small application that consumes it.

```go
// File: go.mod
module github.com/example/go-mod-tutorial

go 1.20
```

```go
// File: calculator/calculator.go
package calculator

// Add returns the sum of two integers.
func Add(a, b int) int {
	return a + b
}
```

```go
// File: main.go
package main

import (
	"fmt"
	"github.com/example/go-mod-tutorial/calculator"
)

func main() {
	sum := calculator.Add(3, 4)
	fmt.Println("3 + 4 =", sum)
}
```

### Line-by-line explanation

- go.mod: Declares the module path and the minimum Go version. This path is the root import path for all packages inside the module.
- calculator/calculator.go: Defines package calculator with an exported function Add. The function signature starts with a capital letter, making it accessible from other packages.
- main.go: Declares package main, imports the calculator package via its module path, calls Add, and prints the result. The import path must match the module root, plus the package path.

## 2. Dependency Management Workflow: Versions, Proxies, and Replacements

This section shows how to declare external dependencies, fetch them, and pin or replace specific versions in Go modules.

```go
// File: go.mod
module github.com/example/go-mod-tutorial

go 1.20

require github.com/google/uuid v1.3.0
```

```go
// File: main_with_uuid.go
package main

import (
	"fmt"
	"github.com/google/uuid"
)

func main() {
	id := uuid.New()
	fmt.Println("Generated UUID:", id)
}
```

### Line-by-line explanation

- go.mod: Adds a dependency on github.com/google/uuid at version v1.3.0. This pins the exact version used when building, ensuring reproducible results.
- main_with_uuid.go: Imports the UUID package and generates a new UUID, demonstrating how dependencies are used in code.

```go
// File: go.mod (with replace)
module github.com/example/go-mod-tutorial

go 1.20

require github.com/google/uuid v1.3.0

replace github.com/google/uuid => ../local-uuid
```

### Line-by-line explanation

- go.mod (with replace): Besides declaring the dependency, a replace directive tells the Go toolchain to use a local path (../local-uuid) instead of the published module. This is useful for local development or for testing a fork without publishing a new version.
- replace directive location: It maps the module path (github.com/google/uuid) to a local filesystem path (../local-uuid). The rest of the file remains the same.

### Line-by-line explanation (go mod tidy workflow)

- When you run go mod tidy, the tool:
  - Adds missing sums to go.sum for the modules in use.
  - Removes unused dependencies.
  - Ensures the module graph is consistent with the imports in your codebase.
- Example commands:
  - go mod tidy
  - go get github.com/google/uuid@v1.3.0 (to fetch or bump a version)
  - go mod vendor (optional: to vendor dependencies)

## 3. Best Practices: Module Layout, Versioning, and Reproducible Builds

This section highlights practical guidelines for structuring modules, pinning versions, and ensuring reproducible builds in production systems.

```go
// File: go.mod
module github.com/example/go-mod-tutorial

go 1.20

require (
  github.com/sirupsen/logrus v1.9.0
  golang.org/x/net v0.21.0
)
```

### Line-by-line explanation

- Multiline require block: Keeps commonly used dependencies with fixed versions. This helps ensure consistent builds across environments and CI systems.
- Logically groups your dependencies so you can audit and update them in controlled steps.

Common production considerations:
- Use go.mod and go.sum to lock versions and validate checksums at build time.
- Prefer explicit versions (no caret ^) to avoid automatic minor/patch bumps that could break behavior.
- Use a module proxy (GOPROXY) for reliable fetches and caching in CI/CD.
- Consider vendor folders in air-gapped environments, but know it adds maintenance overhead.
- Regularly run go mod tidy in CI to detect drift and unused dependencies.
- Use replace and local forks carefully; ensure such changes are clearly documented and tested.

## X. Common Beginner Mistakes

- Bad vs Good: Import path mismatch
  Bad:
  ```go
  import "github.com/example/Go-Mod-Tutorial/calculator"
  ```
  Good:
  ```go
  import "github.com/example/go-mod-tutorial/calculator"
  ```

- Bad vs Good: Forgetting to run go mod tidy after adding a new dependency
  Bad:
  ```go
  // Using uuid without updating go.sum
  id := uuid.New()
  ```
  Good:
  ```go
  // After adding: run
  // go mod tidy
  id := uuid.New()
  ```

- Bad vs Good: Pinning versions locally but not documenting
  Bad:
  ```go
  require github.com/google/uuid v1.3.0
  replace github.com/google/uuid => ../local-uuid
  ```
  Good:
  ```go
  // Document why replace is used and ensure CI tests also exercise the
  // replaced path or remove it before merging to main
  replace github.com/google/uuid => ../local-uuid
  ```

- Bad vs Good: Varying environments without a clear proxy strategy
  Bad:
  ```bash
  export GOPROXY=""
  ```
  Good:
  ```bash
  # Use a stable proxy with authentication if needed
  export GOPROXY=https://proxy.golang.org,direct
  ```

- Bad vs Good: Importing large, unused dependencies
  Bad:
  ```go
  import github.com/sirupsen/logrus
  // ... code that doesn't use logrus
  ```
  Good:
  ```go
  import "github.com/sirupsen/logrus"
  // Use logrus intentionally for structured logging
  log := logrus.New()
  _ = log
  ```

## Y. Why This Matters In Real Systems

- Reproducible builds: go.mod and go.sum lock down exact versions and checksums, enabling consistent builds across dev, CI, and prod.
- Dependency safety: The module graph shows all transitive dependencies, allowing you to audit transitive changes and catch security vulnerabilities.
- Team collaboration: A shared module structure prevents “dependency drift” where different teams accidentally use different versions.
- CI/CD efficiency: Go module proxy and module caching speed up builds and reduce flakiness in pipelines.
- Local development and testing: replace directives enable rapid iteration on forks or local changes without publishing new versions.
- Licensing and risk management: You can review dependencies for licenses and security advisories before deployment.

## Z. Study Questions

1) What is the purpose of a go.mod file in a Go project?  
2) How do you add a new dependency to a Go module?  
3) What does go mod tidy do, and when should you run it?  
4) How would you temporarily test a fork or local change to a module using replace?  
5) What is the difference between a module (go.mod) and a package (the code inside a folder with a package statement) in Go?

## Exercise

A practical multi-part coding challenge to consolidate understanding of modules, packages, and dependency management.

Part 1: Initialize a new module with a local library
- Create a new directory for the exercise.
- Initialize a Go module:
  - go mod init github.com/yourorg/go-mod-exercise
- Create a package named "mathutil" with a function Multiply(a, b int) int in:
  - mathutil/multiply.go
  - Content:
    package mathutil

    func Multiply(a, b int) int {
        return a * b
    }

Part 2: Create a small application that uses your library
- Create main.go in the root or a separate cmd/app folder that uses mathutil.Multiply and prints a result.
  - Content:
    package main

    import (
        "fmt"
        "github.com/yourorg/go-mod-exercise/mathutil"
    )

    func main() {
        prod := mathutil.Multiply(6, 7)
        fmt.Println("6 * 7 =", prod)
    }

Part 3: Add an additional dependency and ensure reproducible builds
- Modify go.mod to require a small dependency, for example:
  - require github.com/google/uuid v1.3.0
- Update main.go to also import and print a generated UUID:
  - Content (snippet):
    import (
        "fmt"
        "github.com/yourorg/go-mod-exercise/mathutil"
        "github.com/google/uuid"
    )

    func main() {
        prod := mathutil.Multiply(6, 7)
        id := uuid.New()
        fmt.Printf("6 * 7 = %d, id=%s\n", prod, id)
    }

- Run:
  - go mod tidy
  - Build and run the program to confirm the dependency resolves and the UUID prints.

Part 4: Local development with replace (optional but recommended for experiments)
- Suppose you want to test a fork of github.com/google/uuid locally:
  - Add a replace directive to go.mod:
    replace github.com/google/uuid => ../local-uuid
  - Create the directory ../local-uuid with a minimal module that provides the New() function matching the expected interface (for testing purposes only).
  - Run go mod tidy again to pick up the replaced path.

Deliverables to check:
- A working module with a simple internal package and a consumer application.
- A second dependency added and resolved via go mod tidy.
- Optional local replacement demonstrating how developers can iterate on dependencies locally before pushing changes. 

This completes a practical, end-to-end walk through modules, packages, and dependency management in Go, with print-ready code examples and production-relevant considerations.