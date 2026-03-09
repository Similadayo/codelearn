# Track: Backend Engineering — Phase 8: Infrastructure & Deployment — Cloud Deployment with Railway, Render & AWS EC2 (Go)

Cloud deployment is the discipline of taking your Go services from code to running, scalable, and observable in real cloud environments. In Phase 8, we explore three popular deployment targets—Railway, Render, and AWS EC2—each with different trade-offs in speed, control, and cost. You’ll learn practical Go patterns for containerized apps, how to wire deployments with provider-specific manifests, and how to bootstrap servers in cloud VMs. Mastery here translates to faster iteration, reliable production behavior, and predictable operations across providers.

## 1. Railway Deployment for Go Services

Railway makes it easy to deploy apps from a Git repository with minimal configuration. This section demonstrates a minimal Go web service ready to deploy on Railway, including containerization and a small service config.

```go
// main.go
package main

import (
  "fmt"
  "log"
  "net/http"
  "os"
)

func main() {
  port := os.Getenv("PORT")
  if port == "" {
    port = "8080"
  }

  http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("OK"))
  })

  http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello from Go on port %s!", port)
  })

  log.Printf("Starting server on :%s", port)
  log.Fatal(http.ListenAndServe(":"+port, nil))
}
```

```go
// go.mod
module example.com/go-railway
go 1.20
```

```dockerfile
# Dockerfile
FROM golang:1.20-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o app .

FROM alpine:3.17
RUN adduser -D appuser
USER appuser
WORKDIR /app
COPY --from=builder /app/app .
ENV PORT=8080
EXPOSE 8080
CMD ["./app"]
```

```toml
# railway.toml
[server]
port = 8080

[build]
cmd = ["bash", "-lc", "go version && go build -o app ./..."]
```

### Line-by-line explanation
- main.go: Imports standard libraries; reads PORT from environment; defaults to 8080; defines /health and / endpoints; starts the HTTP server.
- go.mod: Declares a module path and Go version.
- Dockerfile: Multi-stage build; first stage builds the Go binary; second stage builds a minimal runtime image; exposes port 8080 for the container.
- railway.toml: Minimal Railway config to indicate build command and server port; Railway uses this to set up the service.

## 2. Render Deployment for Go Services

Render offers a simple, cloud-native way to deploy containerized apps with automatic builds and health checks. Here, we reuse the same Go service and containerize it via Docker, with a render.yaml manifest to instruct the platform.

```yaml
# render.yaml
services:
  - type: web
    name: go-railway-render
    dockerfilePath: Dockerfile
    envVars:
      - key: PORT
        value: "8080"
    plan: starter
    healthCheckPath: /health
```

```yaml
# Alternative explicit health check (optional)
# healthCheckPath: /health
```

### Line-by-line explanation
- render.yaml: Declares a web service that Render should deploy using the Dockerfile in the repo.
- dockerfilePath: Path to the Dockerfile to build the container image.
- envVars: Sets PORT environment variable for the Go app.
- plan: Defines the service tier (starter/free tiers vary by region and time; adjust as needed).
- healthCheckPath: Indicates the route to check liveness/probe status.

## 3. AWS EC2 Deployment for Go Services

Deploying to AWS EC2 provides maximum control over the runtime environment (OS, kernel, security groups, etc.). This section shows how to bootstrap a Go app on an EC2 instance using a user-data script and how to provision the instance with Terraform.

```bash
# ec2-user-data.sh (bootstrap script)
#!/bin/bash
set -euo pipefail

PORT=${PORT:-8080}
USER=ubuntu
REPO_URL="https://example.com/my-go-app/releases/latest/go-app-linux-amd64"

apt-get update -y
apt-get install -y curl
curl -L -o /usr/local/bin/go-app "$REPO_URL"
chmod +x /usr/local/bin/go-app

cat >/etc/systemd/system/go-app.service <<'EOF'
[Unit]
Description=Go App
After=network-online.target

[Service]
User=ubuntu
ExecStart=/usr/local/bin/go-app
Restart=always
Environment=PORT=8080

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable go-app
systemctl start go-app
```

```hcl
# main.tf (Terraform, AWS provider)
provider "aws" {
  region = "us-east-1"
}

resource "aws_security_group" "go_api_sg" {
  name        = "go-api-sg"
  description = "Allow HTTP"
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "go_api" {
  ami                    = "ami-0abcdef1234567890" # replace with a valid Linux AMI
  instance_type          = "t3.micro"
  vpc_security_group_ids = [aws_security_group.go_api_sg.id]
  user_data              = file("ec2-user-data.sh")
  key_name               = var.key_pair
  tags = {
    Name = "go-api-ec2"
  }
}
```

```hcl
# variables.tf (Terraform variables)
variable "key_pair" {
  description = "AWS SSH key pair name"
  type        = string
}
```

### Line-by-line explanation
- ec2-user-data.sh: Installs dependencies, downloads the Go binary from a release URL, registers a systemd service, and starts the app. The port is controlled by the PORT environment variable.
- main.tf: Creates a security group allowing inbound HTTP on port 8080, and provisions an EC2 instance with the user_data bootstrap script. The instance uses a public AMI and a small instance type for demonstration.
- variables.tf: Declares the key_pair variable needed to SSH into the instance and other potential variables you might wire in.
- The Terraform snippet illustrates a reproducible, version-controlled way to provision infrastructure for a Go service on EC2.

## X. Common Beginner Mistakes

- Bad: Hard-coding ports or environment values inside code or config.
  - Bad.go:
    func main() {
      port := 8080
      http.ListenAndServe(":8080", nil)
    }
  - Good.go:
    port := os.Getenv("PORT")
    if port == "" { port = "8080" }
    http.ListenAndServe(":"+port, nil)

- Bad: Not containerizing; shipping a binary by hand or relying on host OS state.
  - Bad: Running go build artifacts directly on host GOROOT/GOPATH assumptions.
  - Good:
    - Use a Dockerfile with multi-stage build to produce a small, portable binary.
    - Use a versioned Go base image and pin crate/tooling versions.

- Bad: Not implementing a health/ready check or liveness probe.
  - Bad: Only exposing root page; no /health or /ready endpoints.
  - Good: Expose /health and /ready endpoints; configure Render/Railway healthCheckPath accordingly.

- Bad: Deploying without versioning or immutable artifacts.
  - Bad: docker run with latest image tag in production.
  - Good: Tag images with a semantic version or Git SHA; push to registry; reference tag in deployment manifests.

- Bad: Skipping observability.
  - Bad: No logging, no metrics, no tracing.
  - Good: Integrate structured logging (logrus, zerolog), expose /metrics (Prometheus), and consider distributed tracing (OpenTelemetry).

- Bad: Not automating infrastructure changes.
  - Bad: Manually changing EC2 or cloud resources; drift occurs.
  - Good: Use IaC (Terraform, CloudFormation) and CI/CD to apply changes consistently.

## Y. Why This Matters In Real Systems

- Reliability: Health checks, readiness probes, and proper port handling ensure services recover gracefully and don’t drop traffic during deploys.
- Reproducibility: Containerization and IaC enable identical environments from dev to prod, reducing "it works on my machine" problems.
- Speed: Platform-specific optimizations (Railway/Render) yield fast time-to-value for small teams; EC2 offers cost-effective control at scale.
- Observability: Centralized logs, metrics, and tracing help diagnose outages and performance regressions in production.
- Security: Environment segmentation (security groups, IAM roles), minimal container permissions, and secret handling are essential as you scale.

## Z. Study Questions

1. What are the main differences between deploying on Railway, Render, and AWS EC2 in terms of control and complexity?
2. Why is it important to read PORT from the environment in a Go web service?
3. How does a multi-stage Docker build help in production deployments?
4. What is the purpose of a healthCheckPath in deployment manifests?
5. How can you versionally tag and roll back container images in a cloud deployment workflow?

## Exercise

You are tasked with extending the Go service to be production-ready across all three targets (Railway, Render, and AWS EC2). Complete the following multi-part challenge.

Part A — Extend the Go application
- Add a /version endpoint that returns the app version (e.g., v1.0.0) and the Git SHA if available via an environment variable.
- Add a /ready endpoint that returns 200 when the app is ready to serve (simulate readiness for this exercise).
- Add basic metrics: expose /metrics that returns a simple plain-text metric with a counter for requests.

Part B — Docker and containerization
- Update the Dockerfile to include a small build-time argument (ARG APP_VERSION) and encode the version into the binary at compile time via ldflags.
- Ensure the final image prints the version on startup.

Part C — Railway and Render manifests
- Create updated railway.toml and render.yaml configurations that pass APP_VERSION into the container as an environment variable and wire a health check for /health or /ready accordingly.
- Demonstrate how you would change the deployment when updating APP_VERSION without changing code.

Part D — AWS EC2 bootstrap
- Write a revised ec2-user-data.sh that downloads a prebuilt binary from a versioned URL (e.g., https://example.com/my-go-app/releases/v1.0.0/go-app-linux-amd64) and registers a systemd service that uses PORT from an environment variable.
- Update main.tf to pass the desired PORT and the version string as user data and as a tag on the instance.

Part E — Local testing plan
- Provide a minimal Makefile with targets: build, run (local), docker-build, docker-run, test-health.
- Write a small shell script that makes HTTP requests to /health, /ready, /version, and /metrics and prints results.

Deliverables:
- Updated main.go reflecting Part A.
- Updated Dockerfile with versioning via ARG and ldflags (Part B).
- Updated railway.toml and render.yaml (Part C).
- Updated ec2-user-data.sh and main.tf (Part D).
- Makefile and test script (Part E).
- Brief notes on how you would verify consistency across Railway, Render, and EC2 deployments.

End of lesson.