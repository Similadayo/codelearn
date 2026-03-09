# Track: Backend Engineering — Phase 8 — Infrastructure & Deployment

In modern backend engineering, reliable deployment is as important as correct code. Docker gives you reproducible environments, isolation, and predictable behavior across stages—from development to production. Docker Compose lets you orchestrate multi-service apps (Go services, databases, caches) locally and in CI/CD. This lesson covers containers and docker-compose from a Go-centric perspective, with practical examples, explanations, and real-world considerations for production-grade deployments.

## 1. Docker and Go: Containers, Images, and the Build Lifecycle

- What you’ll learn: the core ideas of images vs containers, building a Go app with multi-stage Dockerfiles, and running your app in a container.

```go
// main.go
package main

import (
  "fmt"
  "net/http"
)

func main() {
  http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "Hello from Go in Docker!")
  })
  // Listen on all interfaces to be reachable from the container's port mapping
  http.ListenAndServe("0.0.0.0:8080", nil)
}
```

```dockerfile
# Dockerfile (multi-stage for Go)
FROM golang:1.20-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Build a statically-linked Linux binary to simplify the final image
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -o app

FROM alpine:3.19
RUN adduser -D appuser
USER appuser
WORKDIR /home/app
COPY --from=builder /src/app .
EXPOSE 8080
CMD ["./app"]
```

### Line-by-line explanation breaking down each line

- main.go
  - package main: declares the executable package.
  - import (...): imports the standard HTTP and I/O utilities.
  - func main(): program entry point.
  - http.HandleFunc("/", ...): registers a handler for the root path.
  - fmt.Fprintln(w, "..."): writes a simple response to the client.
  - http.ListenAndServe("0.0.0.0:8080", nil): starts the HTTP server listening on port 8080 on all interfaces.
- Dockerfile
  - FROM golang:1.20-alpine AS builder: uses a Go toolchain image to build the app.
  - WORKDIR /src: sets the working directory inside the builder stage.
  - COPY go.mod go.sum ./: copies dependency manifests.
  - RUN go mod download: downloads dependencies to leverage Docker cache.
  - COPY . .: copies the rest of the source.
  - CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o app: compiles a static Linux binary to maximize compatibility.
  - FROM alpine:3.19: final runtime image.
  - RUN adduser -D appuser: creates a non-root user to run the app.
  -USER appuser: switches to the non-root user for security.
  - WORKDIR /home/app: sets the runtime working directory.
  - COPY --from=builder /src/app .: copies the compiled binary from the builder stage.
  - EXPOSE 8080: documents the port the app will listen on.
  - CMD ["./app"]: runs the binary when the container starts.

## 2. Building and Running a Go App in Docker

- Build and run locally using a simple Dockerfile (already shown) and container run commands, plus an example docker-compose for local development.

```yaml
# docker-compose.yml
version: "3.9"
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - APP_ENV=development
```

```bash
# Commands to build and run manually
docker build -t go-docker-demo .
docker run -p 8080:8080 --name go-demo -d go-docker-demo
docker ps
```

### Line-by-line explanation breaking down each line

- docker-compose.yml
  - version: "3.9": uses Compose file format 3.9.
  - services.app.build: "." builds the image from the Dockerfile in the current directory.
  - services.app.ports: "8080:8080" maps container port 8080 to host port 8080.
  - services.app.environment: APP_ENV=development is a simple way to configure runtime behavior.
- Docker commands
  - docker build -t go-docker-demo .: builds the image with a tag.
  - docker run -p 8080:8080 --name go-demo -d go-docker-demo: runs the container in detached mode and maps ports.
  - docker ps: lists running containers to verify status.

## 3. Docker Compose with a Database: Go + Postgres

- Why this matters: most backend apps need a database; docker-compose lets you model the app and its DB as a single, reproducible environment.

```go
// main.go (Go app that talks to Postgres)
package main

import (
  "database/sql"
  "fmt"
  "log"
  "net/http"
  "os"

  _ "github.com/lib/pq"
)

func main() {
  dsn := os.Getenv("DATABASE_URL")
  if dsn == "" {
    // Fallback to a common Docker Compose default
    dsn = "postgres://postgres:postgres@db:5432/postgres?sslmode=disable"
  }

  db, err := sql.Open("postgres", dsn)
  if err != nil {
    log.Fatal(err)
  }
  defer db.Close()

  if err := db.Ping(); err != nil {
    log.Fatal(err)
  }

  http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    var now string
    err := db.QueryRow("SELECT NOW()").Scan(&now)
    if err != nil {
      w.WriteHeader(http.StatusInternalServerError)
      fmt.Fprintln(w, "db error")
      return
    }
    fmt.Fprintf(w, "DB time: %s", now)
  })

  http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    fmt.Fprintln(w, "OK")
  })

  http.ListenAndServe(":8080", nil)
}
```

```yaml
# docker-compose.yml (Go + Postgres)
version: "3.9"
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/postgres?sslmode=disable
    depends_on:
      - db
  db:
    image: postgres:14
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

### Line-by-line explanation breaking down each line

- main.go
  - _ "github.com/lib/pq": blank import to register the Postgres driver with database/sql.
  - DATABASE_URL: environment variable used to configure DB connection; default falls back to a common docker-compose setup.
  - db.Ping(): ensures the DB connection is alive before serving requests.
  - http.HandleFunc("/")/: executes a simple query (SELECT NOW()) to demonstrate DB access.
  - /health: simple health endpoint for orchestrators to probe.
- docker-compose.yml
  - app.service: builds the Go app and maps port 8080.
  - environment.DATABASE_URL: provides DB connection details to the app.
  - app.depends_on: ensures the DB service starts before the app.
  - db.service: runs Postgres with basic credentials and a persistent volume.
  - volumes.pgdata: persists DB data across restarts.

## 4. Security and Best Practices: Dockerfile Hygiene and Build Efficiency

- Why it matters: smaller, non-root containers reduce blast radius and improve security; proper ignores improve build cache and speed.

```dockerfile
# Dockerfile (with non-root user and cache-friendly steps)
FROM golang:1.20-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -o app

FROM alpine:3.19
RUN apk add --no-cache curl
RUN adduser -D appuser
USER appuser
WORKDIR /home/app
COPY --from=builder /src/app .
EXPOSE 8080
CMD ["./app"]
```

```text
# .dockerignore
.git
vendor
node_modules
*.log
.env
build/
```

### Line-by-line explanation breaking down each line

- Dockerfile
  - RUN apk add --no-cache curl: installs curl to enable simple health checks from the container if needed.
  - RUN adduser -D appuser: creates a non-root user.
  - USER appuser: runs the app with non-privileged user.
- .dockerignore
  - Prevents unnecessary files and directories from being copied into the build context, speeding up builds and reducing image size.

## 5. Production Readiness: Healthchecks, Logging, Volumes, and Scaling

- Production realities: health checks help orchestration systems replace unhealthy instances; volumes persist data; proper restart policies enable resilience.

```yaml
# docker-compose.yml enhanced for production-like health checks
version: "3.9"
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/postgres?sslmode=disable
    depends_on:
      - db
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
  db:
    image: postgres:14
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

### Line-by-line explanation breaking down each line

- app.healthcheck
  - test: uses curl to fetch /health; if it fails, the container is marked unhealthy.
  - interval/timeout/retries: tune how aggressively the system checks health and when it restarts.

## 6. CI/CD: Building, Tagging, and Pushing Docker Images

- Why it matters: automated pipelines ensure reproducibility, fast feedback loops, and safe deployments.

```yaml
# .github/workflows/docker-build-push.yml
name: Build and Push Docker Image

on:
  push:
    branches: [ main ]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-qemu-action@v1
      - uses: docker/setup-buildx-action@v1

      - name: Log in to registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v3
        with:
          context: .
          push: true
          tags: ghcr.io/your-org/your-repo:latest
```

### Line-by-line explanation breaking down each line

- on.push.branches: triggers on pushes to main.
- docker/setup-qemu-action + docker/setup-buildx-action: enable multi-arch builds and modern builds.
- docker/login-action: authenticates to a container registry (GitHub Container Registry in this example).
- docker/build-push-action: builds and pushes the image to the registry with a tag.

## X. Common Beginner Mistakes

- Mistake 1: Copying the entire project into the image without filtering with .dockerignore.
  - Bad:
    - COPY . .
  - Good:
    - Use .dockerignore and COPY for only needed files (e.g., COPY go.mod go.sum ./ and COPY . . with proper cache layering).
- Mistake 2: Running as root inside the container.
  - Bad:
    - RUN useradd and USER root
  - Good:
    - Create a non-root user and switch to it (as shown in the examples).
- Mistake 3: Not using multi-stage builds, leading to large final images.
  - Bad:
    - Build and copy the entire Go toolchain into the final image.
  - Good:
    - Use a builder stage to compile, then copy only the binary to a slim runtime image.
- Mistake 4: Hard-coding configuration and secrets.
  - Bad:
    - APP_ENV=production, DATABASE_URL hard-coded in Dockerfile or Compose.
  - Good:
    - Use environment variables, .env support, and secret management patterns in Compose and CI/CD.

## Y. Why This Matters In Real Systems

- Reproducibility: containers encapsulate runtime dependencies, ensuring the same behavior across dev, test, and prod.
- Isolation: processes, filesystem, and network namespaces prevent side effects between services.
- Faster deployments: small, layered images load quickly; incremental builds leverage Docker cache.
- Rollback and scaling: images are immutable; you can roll back by tagging and redeploying; Compose/Orchestrators scale services by adjusting replicas.
- Operational safety: health checks, restart policies, and resource constraints help keep services resilient under load.

## Z. Study Questions

1. What is the difference between a Docker image and a container?
2. Why are multi-stage Docker builds recommended for Go applications?
3. How can you connect a Go application to a PostgreSQL database when using Docker Compose?
4. What is the purpose of a healthcheck in a docker-compose.yml, and how is it typically implemented?
5. How would you extend a docker-compose.yml to include a Redis service and use it from a Go app?

## Exercise

Part A — Build and run a simple Go HTTP service in Docker
- Deliverables:
  - A Go HTTP server exposing:
    - GET / returns "Hello from Go in Docker!"
    - GET /health returns 200 OK
  - A multi-stage Dockerfile (as shown) to build and run the service in a slim runtime image.
  - A docker-compose.yml to run the app locally.

Part B — Add a Postgres service and connect from Go
- Deliverables:
  - Extend the app to connect to a Postgres database and return the current timestamp from the DB on GET /time.
  - docker-compose.yml now includes a postgres service (user: postgres, pass: postgres, db: postgres).
  - The Go code uses DATABASE_URL to configure the connection string; provide a default that points to the db service when running with Compose.
  - Health check for the app and DB service in Compose.

Part C — Production-like readiness
- Deliverables:
  - Add a healthcheck for the app in docker-compose.yml.
  - Ensure a non-root user runs the app in the final image.
  - Add a minimal .dockerignore and demonstrate how it reduces build times.

Part D — CI/CD integration (optional)
- Deliverables:
  - A GitHub Actions workflow that builds the Docker image on push to main and pushes it to ghcr.io with the latest tag.
  - Include steps for setting up Buildx and QEMU if you need multi-arch support.

Notes for the implementer:
- You can start with the files provided in Sections 1–3 as templates.
- Extend the Go code and Compose files incrementally for Parts B–D.
- Test locally: docker-compose up --build, curl http://localhost:8080/health, curl http://localhost:8080/.
- Ensure you understand how caching in the Dockerfile affects build times, and how changing go.mod triggers cache invalidation.

If you’d like, I can tailor the exercise scaffolds to a specific repo layout or CI/CD platform you’re using (GitHub Actions, GitLab CI, CircleCI, etc.).