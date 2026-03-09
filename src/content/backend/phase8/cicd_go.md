# CI/CD with GitHub Actions Pipelines in Go

1. Compelling introductory paragraph: CI/CD pipelines automate the repetitive, error-prone steps of building, testing, and deploying Go backends. By embracing GitHub Actions for your Go projects, you gain reproducible environments, faster feedback, automated quality gates (tests, linting, vetting), and reliable deployment processes. This lesson walks through building a practical CI/CD pipeline tailored to Go, including unit tests, formatting checks, static analysis, Docker image publishing, and a production-ready deployment workflow.

## 1. Go Project Structure and Prerequisites for CI
```go
// go.mod
module github.com/yourorg/go-ci-demo

go 1.20
```

```go
// main.go
package main

import (
	"fmt"
	"net/http"
)

func helloHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Hello from CI/CD Go backend!")
}

func main() {
	http.HandleFunc("/", helloHandler)
	// Run on a configurable port; default to 8080 for local testing
	fmt.Println("Starting server on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		panic(err)
	}
}
```

```go
// service.go
package main

// greeting is a tiny business logic example to test in CI.
func greeting(name string) string {
	if name == "" {
		return "Hello, World!"
	}
	return "Hello, " + name + "!"
}
```

```go
// service_test.go
package main

import "testing"

func TestGreeting(t *testing.T) {
	if got := greeting("CI"); got != "Hello, CI!" {
		t.Fatalf("greeting(\"CI\") = %q; want %q", got, "Hello, CI!")
	}
}

func TestGreetingEmpty(t *testing.T) {
	if got := greeting(""); got != "Hello, World!" {
		t.Fatalf("greeting(\"\") = %q; want %q", got, "Hello, World!")
	}
}
```

### Line-by-line explanation breaking down each line
- go.mod: Declares module path for the project and sets Go version compatibility.
- main.go:
  - package main: Defines the main package.
  - Imports: fmt for formatting/printing and net/http for HTTP server.
  - helloHandler: HTTP handler writing a greeting to the response.
  - main: Sets up a simple HTTP server on default route and port, logs startup, and panics on failure.
- service.go:
  - greeting: Small business-logic function used by tests to demonstrate unit testing in CI.
- service_test.go:
  - TestGreeting: Verifies that greeting("CI") returns "Hello, CI!".
  - TestGreetingEmpty: Verifies that greeting("") returns "Hello, World!".
- Overall CI signal: The tests exercise the core logic of the app, giving CI visibility into code correctness and preventing regressions.

## 2. GitHub Actions Workflow Basics for Go
```yaml
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
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.20'

      - name: Cache Go modules
        uses: actions/cache@v3
        with:
          path: |
            ~/.cache/go-build
            /home/runner/go/pkg/mod
          key: ${{ runner.os }}-go-${{ hashFiles('go.sum') }}
          restore-keys: |
            ${{ runner.os }}-go-

      - name: Download dependencies
        run: go mod download

      - name: Run tests
        run: go test ./...

      - name: Build binary
        run: go build -o app .
```

### Line-by-line explanation breaking down each line
- name: Go CI: Sets the workflow name.
- on: Triggers for push on main and PRs targeting main.
- jobs.build: Defines a single job named "build" that runs on Ubuntu.
- steps:
  - actions/checkout@v4: Checks out the repository so workflow can access code.
  - actions/setup-go@v4: Installs specified Go version (1.20) for the job.
  - actions/cache@v3: Caches Go build cache and module cache to speed up subsequent runs.
  - go mod download: Downloads module dependencies as defined in go.mod.
  - go test ./...: Runs all tests in the module (recursively).
  - go build -o app .: Builds the binary for the repository root.

## 3. Quality Gates: Formatting, Vet, and Lint in CI
```yaml
jobs:
  quality:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.20'

      - name: Check formatting (gofmt)
        run: bash -c "unformatted=$(gofmt -l .); if [ -n \"$unformatted\" ]; then echo 'Code is not formatted:'; echo \"$unformatted\"; exit 1; fi"

      - name: Run go vet
        run: go vet ./...

      - name: Run golangci-lint
        uses: golangci/golangci-lint-action@v3
        with:
          version: v1.55.0
```

### Line-by-line explanation breaking down each line
- quality job: Runs after the build job to ensure code quality gates.
- Checkout/go/setup-go: Repeats the necessary environment setup for lint and vet.
- Check formatting: Uses gofmt to detect non-formatted files; exits with error if any are found.
- go vet: Static analysis to catch suspicious constructs, misuses, and common mistakes.
- golangci-lint-action: Runs the golangci-lint suite (a multi-late lint aggregator) to surface lint issues, complexity issues, and other quality signals.

## 4. Build, Test, and Publish Docker Images
```dockerfile
# Dockerfile
FROM golang:1.20-alpine

WORKDIR /app
COPY go.mod .
COPY go.sum .
RUN go mod download

COPY . .
RUN go build -o app .

EXPOSE 8080
CMD ["./app"]
```

```yaml
jobs:
  dockerize:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.20'

      - name: Build Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
```

### Line-by-line explanation breaking down each line
- Dockerfile:
  - FROM golang:1.20-alpine: Uses a lightweight Go base image.
  - WORKDIR /app: Sets the working directory in the container.
  - COPY go.mod and go.sum: Copies module metadata first to leverage caching.
  - RUN go mod download: Downloads dependencies inside the container.
  - COPY . .: Copies the rest of the project files.
  - RUN go build -o app .: Compiles the Go app to a binary named app.
  - EXPOSE 8080: Documents the port the app uses.
  - CMD ["./app"]: Default command to run the binary.
- dockerize job:
  - docker/build-push-action@v4: Builds and optionally pushes the image.
  - context: . and push: true to publish to the registry.
  - tags: ghcr.io/${{ github.repository }}:latest tags the image with the repository path in GitHub Container Registry.

## 5. Deployment and Environment Management
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: dockerize
    environment:
      name: production
      url: https://example.prod
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'latest'

      - name: Configure kubeconfig
        env:
          KUBECONFIG_DATA: ${{ secrets.KUBE_CONFIG_DATA }}
        run: |
          echo "$KUBECONFIG_DATA" | base64 -d > "$HOME/.kube/config"

      - name: Deploy to Kubernetes
        run: kubectl apply -f k8s/
```

```yaml
# k8s/deployment.yaml (example)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: go-ci-demo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: go-ci-demo
  template:
    metadata:
      labels:
        app: go-ci-demo
    spec:
      containers:
      - name: go-ci-demo
        image: ghcr.io/${{ github.repository }}:latest
        ports:
        - containerPort: 8080
```

### Line-by-line explanation breaking down each line
- deploy job: Runs after dockerize; targets production environment with a deployment URL.
- Set up kubectl: Installs kubectl to interact with the cluster.
- Configure kubeconfig: Reads kubeconfig from GitHub Secrets to authenticate to the cluster.
- Deploy to Kubernetes: Applies Kubernetes manifests to update the running deployment.
- k8s/deployment.yaml: Kubernetes Deployment manifest that pulls the Docker image published by GitHub Actions and exposes port 8080.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side
- Mistake 1: Not pinning Go version or using an out-of-date image
  - Bad:
    - uses: actions/setup-go@v2
      with:
        go-version: '1.18'
  - Good:
    - uses: actions/setup-go@v4
      with:
        go-version: '1.20'

- Mistake 2: Skipping dependency caching
  - Bad:
    - run: go mod download
  - Good:
    - uses: actions/cache@v3
      with:
        path: |
          ~/.cache/go-build
          /home/runner/go/pkg/mod
        key: ${{ runner.os }}-go-${{ hashFiles('go.sum') }}
        restore-keys: |
          ${{ runner.os }}-go-

- Mistake 3: Not failing the build on lint/formats
  - Bad:
    - name: Lint
      run: golangci-lint run || true
  - Good:
    - name: Lint (fail on issues)
      run: |
        golangci-lint run
      continue-on-error: false

- Mistake 4: Printing secrets or leaking sensitive info
  - Bad:
    - run: echo "${{ secrets.DATABASE_PASSWORD }}"
  - Good:
    - run: echo "DATABASE_PASSWORD is set" # Do not print the actual secret

## Y. Why This Matters In Real Systems — production context and real usage
- Predictable releases: CI/CD provides deterministic builds, ensuring every environment runs the same artifact.
- Quality gates: Automated tests, formatting, vetting, and linting catch issues early, reducing production incidents.
- Faster feedback: Developers get rapid signals on code changes, accelerating iteration cycles.
- Secure deployments: Secrets are managed via environment and repository secrets, reducing the risk of credential leakage.
- Rollbacks and canaries: Deployments to canary or staged environments enable safe rollbacks if issues appear.
- Observability: CI/CD workflows can generate build/test artifacts, test coverage reports, and deployment dashboards that improve operational visibility.

## Z. Study Questions — 5 recall questions
1. What is the purpose of caching Go modules in GitHub Actions, and how is it implemented?
2. How can you enforce code quality gates (formatting, vetting, linting) in a single Go CI workflow?
3. What are the benefits and risks of publishing a Docker image as part of CI, and how can you publish to GHCR?
4. How do you configure a production deployment to require manual approval or environment-specific controls in GitHub Actions?
5. Name two common mistakes that can cause CI builds to be unreliable or insecure, and how you would fix them.

## Exercise — a practical multi-part coding challenge
Part A: Initialize a Go module and implement a tiny API
- Create a new Go module at github.com/yourorg/go-ci-demo with Go 1.20.
- Implement main.go to serve on port 8080 with a root route that returns "Hello from CI/CD Go backend!".
- Implement service.go with a small business-logic function greeting(name string) and return values.
- Implement service_test.go with tests for greeting().

Code to start (you can reuse the files from Section 1 as a baseline).

Part B: Create a GitHub Actions CI workflow
- Add .github/workflows/ci.yml that:
  - Checks out code, sets up Go 1.20, caches modules, runs go mod download, go test, and go build.
  - Includes a separate quality gate job that checks formatting (gofmt), runs go vet, and runs golangci-lint.
Part C: Dockerize the app and publish to GHCR
- Create a Dockerfile (as in Section 4) that builds a static Go binary and runs it.
- Extend the workflow to build and push the image to GHCR: ghcr.io/${{ github.repository }}:latest.
Part D: Prepare a Kubernetes deployment manifest
- Create k8s/deployment.yaml that deploys the app image to a Kubernetes cluster, with replicas: 2 and containerPort: 8080.
- In the workflow, add a deploy job that uses kubectl to apply manifests from the k8s/ directory (using a secret-based kubeconfig).
Part E: Run locally and verify
- Build and run the Go app locally: go build -o app . && ./app
- Use curl to verify root path returns the expected response.
- Simulate a CI run by running the tests locally: go test ./...

Note: Replace placeholders like github.com/yourorg/go-ci-demo and GHCR repository paths with real values in your environment. This exercise guides you through a complete, practical CI/CD pipeline for a Go backend, from code to deployment.