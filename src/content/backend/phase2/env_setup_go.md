# Setting Up a Professional Dev Environment (Go)

Creating a professional dev environment is essential for reliable, scalable backend work. In Go, a standardized toolchain, reproducible builds, consistent linting, robust testing, and containerized local workflows are the backbone of healthy team velocity. This lesson walks you through setting up version management, project scaffolding, build/test/lint pipelines, local Docker-based workflows, debugging/profiling, and production-aligned habits so you can ship confidently.

## 1. Tooling and Version Management

Setting up consistent Go tooling and version management ensures every developer and CI agent runs the same compiler, standard library, and module rules. This reduces “works on my machine” issues, speeds onboarding, and enables reproducible builds.

### Code: Go version management with asdf (example workflow)
```bash
# Install asdf (example; adapt to your OS)
git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.11.3
echo ". $HOME/.asdf/asdf.sh" >> ~/.bashrc
echo ". $HOME/.asdf/completions/asdf.bash" >> ~/.bashrc
source ~/.bashrc

# Add Go plugin and install a specific version
asdf plugin-add golang
asdf install golang 1.20.8
asdf global golang 1.20.8

# Ensure module mode and proxy are correctly set
export GO111MODULE=on
export GOPROXY=https://proxy.golang.org,direct
go env GOPROXY
```

### Code: Alternative baseline environment variables for module mode
```bash
# Enforce module-based workflows without a version manager
export GO111MODULE=on
export GOPROXY=https://proxy.golang.org,direct
go env GOPROXY
```

### Line-by-line explanation
- Install asdf and set up shells so future sessions inherit the toolchain management.
- Add the Go plugin to asdf, install a concrete Go version, and set it as global so all shells use it by default.
- Enable module mode (GO111MODULE=on) to ensure dependencies are resolved with Go modules rather than GOPATH.
- Configure GOPROXY to a reliable proxy, improving reproducibility and speed.
- go env GOPROXY prints the proxy setting to verify it's configured.

## 2. Project Scaffolding and Module Setup

A clean project structure with a Go module enables predictable builds, clear separation of concerns, and easier testing. Typical Go projects for backend services place the main app under cmd/, share libraries under pkg/ or internal/, and place tests alongside code.

### Code: Initialize a Go module and scaffold a minimal server
```bash
# Create a standard Go project layout
mkdir -p go-app/cmd/server
cd go-app

# Initialize a module
go mod init github.com/yourorg/go-app

# Create a minimal server in cmd/server/main.go
cat > cmd/server/main.go <<'GO'
package main

import (
	"fmt"
	"net/http"
)

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "healthy")
}

func main() {
	http.HandleFunc("/health", healthHandler)
	fmt.Println("server listening on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		panic(err)
	}
}
GO

# Format, verify, and tidy dependencies
go fmt ./...
go vet ./...
go mod tidy
```

### Line-by-line explanation
- mkdir -p go-app/cmd/server creates a conventional layout with a command under cmd/server.
- go mod init github.com/yourorg/go-app initializes a new module with a path that resembles a repository URL.
- The Go file defines a simple HTTP server with a health endpoint to verify runtime readiness.
- http.HandleFunc registers the /health route to be served by the default mux.
- http.ListenAndServe starts the server on port 8080 and panics on fatal errors.
- go fmt ./... formats all Go files in the module.
- go vet ./... runs static analysis checks across packages.
- go mod tidy ensures go.mod/go.sum reflect all imports used.

### Line-by-line explanation (main.go)
- package main declares the executable package.
- import imports fmt for output and net/http for HTTP primitives.
- healthHandler writes a 200 OK and a small payload indicating health.
- main registers the health handler and starts the HTTP server on port 8080.
- fmt.Println prints the startup message to the console.
- if err := http.ListenAndServe(":8080", nil) starts the server and panics if it fails.

## 3. Build, Test, Lint, and Formatting Pipeline

A disciplined pipeline enforces code quality and protects against regression. A Makefile (or Taskfile) paired with a linter configuration and a CI workflow ensures every change is formatted, vetted, tested, and built before merging.

### Code: Makefile for common Go tasks
```makefile
# Makefile
SHELL := /bin/bash

.PHONY: all fmt vet test build lint

all: fmt vet test build

fmt:
	@echo "Formatting all Go files..."
	go fmt ./...

vet:
	@echo "Running go vet..."
	go vet ./...

test:
	@echo "Running tests..."
	go test ./...

build:
	@echo "Building..."
	go build ./...

lint:
	@echo "Running golangci-lint..."
	golangci-lint run
```

### Code: GolangCI-Lint configuration (example)
```yaml
# .golangci.yml
run:
  timeout: 5m
linters:
  enable:
    - govet
    - gosimple
    - ineffassign
    - staticcheck
    - unused
```

### Code: GitHub Actions workflow (Go CI)
```yaml
# .github/workflows/go-ci.yml
name: Go CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v4
        with:
          go-version: '1.20'
      - run: go mod download
      - run: go test ./...
      - run: go build ./...
```

### Line-by-line explanation
- Makefile targets provide a simple, repeatable local workflow for formatting, vetting, testing, building, and linting.
- golangci-lint config enables a suite of static analysis checks useful for catching common bugs and inefficiencies.
- The GitHub Actions workflow defines a CI pipeline that checks out code, installs a specific Go version, downloads modules, runs tests, and builds the binary on pushes or PRs to main.
- Each step is isolated and deterministic: this reduces flaky CI results and speeds up feedback.

## 4. Local Development with Docker

Dockerization provides a reproducible runtime environment, isolating dependencies and enabling a consistent dev server stack across machines. A typical setup includes a Go application container and supporting services like a database.

### Code: Dockerfile for a Go service
```dockerfile
# Dockerfile
FROM golang:1.20-alpine

WORKDIR /app

# Cache module downloads
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN go build -o /app/main ./cmd/server

EXPOSE 8080

CMD ["/app/main"]
```

### Code: docker-compose.yml with app and Postgres
```yaml
# docker-compose.yml
version: "3.9"
services:
  app:
    build: .
    ports:
      - "8080:8080"
    volumes:
      - .:/app
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: devdb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

### Line-by-line explanation
- The Dockerfile starts from a lightweight Go image, sets the working directory, and caches module downloads to speed up rebuilds.
- It copies the module files first to leverage Docker layer caching, then the rest of the code.
- go build compiles the server binary into /app/main and the image exposes port 8080.
- docker-compose.yml defines two services: app (the Go server) and db (PostgreSQL).
- App service builds from the current directory and binds host port 8080 to container port 8080 for easy access.
- DB service uses a standard Postgres image, with environment variables for a default user, password, and database.
- A named volume (pgdata) persists DB data between restarts.

### Line-by-line explanation (docker-compose)
- version defines the Compose file format.
- services declares app and db.
- app: build context, port mapping, and code mounting for live edits (development convenience).
- db: Postgres configuration, credentials, port mapping, and data persistence.
- volumes ensures DB data persists across container restarts.

## 5. Debugging and Profiling

A professional environment includes robust debugging and profiling capabilities to diagnose performance issues and correctness problems without guesswork.

### Code: Delve (dlv) debugging setup
```bash
# Install Delve (Go debugger)
go install github.com/go-delve/delve/cmd/dlv@latest

# Build and debug the Go server with Delve in headless mode
dlv debug ./cmd/server --listen=:2345 --headless --api-version=2 --continue
```

### Code: Enabling runtime profiling (pprof) in code (optional guidance)
```go
// main.go (additions)
import _ "net/http/pprof"

func main() {
	// existing setup...
	// http.ListenAndServe(":8080", nil)
}
```

### Line-by-line explanation
- go install downloads and builds the Delve debugger binary.
- dlv debug compiles the target package and starts a headless server listening on port 2345 for remote debugging.
- The optional pprof integration via importing net/http/pprof exposes debugging endpoints under /debug/pprof for CPU/heap/goroutine profiling.
- When Delve runs, you can connect from an IDE or use dlv commands to inspect breakpoints, variables, and call stacks.

## 6. Why This Matters In Real Systems

In production-grade teams, a professional dev environment translates into:

- Reproducible builds across developers and CI, reducing time spent diagnosing toolchain inconsistencies.
- Consistent dependency management (Go modules) and proxy usage, ensuring deterministic builds even with network variance.
- Automated formatting, linting, and testing to catch regressions early and keep codebases clean.
- Containerized local development mirroring production stacks, enabling faster onboarding and easier on-call debugging.
- Debugging and profiling capabilities in local/dev clusters, making performance issues tractable rather than guesswork.
- CI/CD pipelines that ensure code quality and security checks before deployment.

In practice, this means you can spin up a dev environment that mirrors CI and production with a few commands, onboard new engineers quickly, and reduce the blast radius of bugs in live systems.

## 7. Study Questions

1. What is the primary benefit of using Go modules with a fixed Go version in a team project?
2. How does GOPROXY contribute to build reproducibility, and why would you tweak it?
3. Describe how a Docker-based local dev workflow helps align developers with production environments.
4. What is the purpose of adding net/http/pprof in a Go server, and how would you use it?
5. Why is it important to run formatting, vetting, and tests as part of a PR or CI workflow?

## 8. Exercise

Complete the following multi-part coding challenge to solidify your understanding of setting up a professional Go dev environment.

Part A — Initialize a Go module and scaffold
- Create a new directory structure for a Go module named github.com/yourorg/dev-env-exercise.
- Initialize the module and create a minimal HTTP server with a /health endpoint using net/http.
- Ensure go mod tidy runs and the code passes go fmt.

Part B — Add Docker-based local development
- Write a Dockerfile that builds the server from Part A.
- Create a docker-compose.yml that includes the app and a PostgreSQL service.
- Ensure the app can connect to the database using environment variables and a CLI parameter or simple DB code path (you may mock DB interaction for this exercise).

Part C — Implement a small helper with tests
- Create a small utility function in a new package (e.g., internal/utils) and unit test it.
- Write at least two tests that exercise both typical and edge-case inputs.

Part D — Add a Makefile and CI snippet
- Create a Makefile with targets: fmt, vet, test, build, and lint (using golangci-lint) that work on the module from Part A.
- Add a minimal GitHub Actions workflow that runs go mod download, go test, and go build on push to main.

Part E — Validate the end-to-end workflow
- From your repo root, run: make fmt vet test build
- Start the app via Docker Compose and verify the /health endpoint responds.
- If you added pprof or dlv steps in Part C, demonstrate a basic profiling/debug workflow locally.

Deliverables to verify:
- A Git repository with the described structure and files.
- A running Docker Compose setup that serves on port 8080 and has a PostgreSQL container ready.
- A small unit-tested utility, a Makefile, and a GitHub Actions workflow that runs on push.

If you want, I can tailor the scaffolding to your preferred directory layout, CI provider, or database flavor and provide a ready-to-run repository template.