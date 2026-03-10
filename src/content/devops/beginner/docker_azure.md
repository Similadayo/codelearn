# Docker Deep Dive in Azure: Phase 2 — Containers & CI/CD

Containers lock in consistency across development, testing, and production. In Azure-centric DevOps and Cloud Engineering, Docker is the standard for packaging applications, while Azure Container Registry (ACR), Azure Kubernetes Service (AKS), and Azure Pipelines enable scalable, repeatable CI/CD workflows. This lesson dives into practical Docker patterns, production-ready builds, and end-to-end CI/CD in an Azure context, with concrete code examples and production considerations.

## 1. Docker Fundamentals and Azure Registries

Understand the core Docker concepts and how they map to Azure registries and pipelines. This section covers a minimal containerized Node.js app, how to build locally, and how to push to an Azure Container Registry.

```Dockerfile
# Use Node.js runtime as base
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Expose the app port
EXPOSE 3000

# Run the app
CMD ["node", "server.js"]
```

```text
# .dockerignore to keep image lean
node_modules
npm-debug.log
Dockerfile
.dockerignore
.git
.gitignore
```

```bash
# Build image locally
docker build -t myapp:1.0.0 .

# Run container locally (test)
docker run -p 3000:3000 myapp:1.0.0
```

### Line-by-line explanation breaking down each line

- FROM node:18-alpine
  - Uses a lightweight Node.js 18 image as the base to minimize final image size.
- WORKDIR /app
  - Sets the working directory inside the container for subsequent commands.
- COPY package*.json ./
  - Copies package manager files to install dependencies first, enabling layer caching.
- RUN npm install
  - Installs production dependencies. If you use package-lock.json, this locks versions.
- COPY . .
  - Copies the rest of the application code into the image.
- EXPOSE 3000
  - Documents which port the app will listen on at runtime.
- CMD ["node", "server.js"]
  - Runs the Node.js app when the container starts.
- .dockerignore entries
  - Excludes unnecessary files from the image context to speed up builds and reduce size.
- docker build / docker run
  - Build creates a local image; run starts a container for local testing.

## 2. Multi-stage Builds and Production Images for Azure

Production images should be minimal and deterministic. Multi-stage builds let you separate the build environment from the runtime environment, reducing image size and surface area for security issues. We’ll show a multi-stage Dockerfile and how to build/push to Azure Container Registry (ACR) with support for multi-arch.

```Dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build || true

# Stage 2: Runtime
FROM node:18-alpine
WORKDIR /app
# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

```bash
# Authenticate with Azure Container Registry
az acr login --name myacr

# Optional: ensure a multi-arch builder exists
docker buildx create --use

# Build and push multi-arch image to ACR
docker buildx build --platform linux/amd64,linux/arm64 \
  -t myacr.azurecr.io/myapp:latest --push .
```

### Line-by-line explanation breaking down each line

- FROM node:18-alpine AS builder
  - Creates a separate stage named 'builder' for compiling dependencies and sources; keeps final image lean.
- WORKDIR /app
  - Sets the working directory in the builder stage.
- COPY package*.json ./
  - Copies package files to install dependencies in the builder stage.
- RUN npm ci
  - Installs exact, lockfile-based dependencies in reproducible manner.
- COPY . .
  - Copies the rest of the application code to the builder stage.
- RUN npm run build || true
  - Optional build step; if your app doesn’t need a compile step, this is a no-op.
- FROM node:18-alpine
  - Runtime stage uses a small Node.js image, separate from the builder.
- WORKDIR /app
  - Runtime working directory.
- COPY --from=builder /app/dist ./dist
  - Copy built assets from the builder stage into the runtime image.
- COPY package*.json ./
  - Copy package manifests into runtime image to install dependencies suitable for runtime.
- RUN npm ci --omit=dev
  - Install only production dependencies in the runtime image.
- EXPOSE 3000
  - Document the port that the app listens on.
- CMD ["node", "dist/server.js"]
  - Run the app from the dist output in production.

```yaml
# Example Azure Pipelines YAML snippet (build and push to ACR)
trigger:
  - main

resources:
  pipelines: []

variables:
  imageName: myacr.azurecr.io/myapp

stages:
- stage: Build
  displayName: Build and Push Docker Image
  jobs:
  - job: Build
    displayName: Docker Build
    pool:
      vmImage: 'ubuntu-latest'
    steps:
    - task: Docker@2
      displayName: Build and Push
      inputs:
        containerregistry: 'MyACRConnection'  # Azure service connection to ACR
        repository: 'myapp'
        command: 'buildAndPush'
        Dockerfile: '**/Dockerfile'
        tags: |
          $(Build.BuildId)
```

### Line-by-line explanation breaking down each line

- trigger: - main
  - Runs the pipeline on changes to the main branch.
- variables.imageName
  - Sets the target image repository in ACR.
- task: Docker@2 with command: buildAndPush
  - Uses the Docker task to build the image and push it to ACR in one step.
- containerregistry: 'MyACRConnection'
  - Refers to an Azure service connection that has credentials for the ACR.
- repository: 'myapp'
  - Image name within the registry.
- Dockerfile: '**/Dockerfile'
  - Path to the Dockerfile to use for building.
- tags: $(Build.BuildId)
  - Tags the image with the pipeline build ID for traceability.

```bash
# Alternative: Azure CLI approach within a pipeline or script
az acr login --name myacr
docker build -t myacr.azurecr.io/myapp:latest .
docker push myacr.azurecr.io/myapp:latest
```

### Line-by-line explanation breaking down each line

- az acr login --name myacr
  - Authenticates Docker to push to the ACR.
- docker build -t myacr.azurecr.io/myapp:latest .
  - Builds the image and tags it with the ACR path.
- docker push myacr.azurecr.io/myapp:latest
  - Pushes the built image to the ACR repository.

## 3. CI/CD with Azure Pipelines for Docker

Automating builds, tests, and deployments is essential for reliable releases. This section demonstrates a practical pipeline approach: building your Docker image, scanning it, pushing to ACR, and (optionally) deploying to AKS or App Service for Containers.

```yaml
trigger:
  - main

variables:
  imageName: myacr.azurecr.io/myapp
  tag: $(Build.BuildId)

stages:
- stage: Build
  jobs:
  - job: BuildAndPush
    pool:
      vmImage: 'ubuntu-latest'
    steps:
    - task: Docker@2
      inputs:
        containerregistry: 'MyACRConnection'
        repository: 'myapp'
        command: 'buildAndPush'
        Dockerfile: '**/Dockerfile'
        tags: |
          $(tag)

    - script: |
        docker pull $(imageName):$(tag)
        docker scan $(imageName):$(tag)
      displayName: 'Run Docker Scan'
```

### Line-by-line explanation breaking down each line

- trigger: main
  - Start the pipeline on changes to main.
- variables.imageName and tag
  - Define the target registry path and a unique tag per build.
- Docker@2 with buildAndPush
  - Build and push the image to ACR in a single step.
- docker scan
  - Optional security scan to identify vulnerabilities in the image.

## 4. Security, Scanning, and Best Practices

Security is not optional in CI/CD. This section shows practical approaches to scanning, secrets management, and minimizing risk in container images.

```bash
# Quick local image scan (requires Docker Scan supported tooling)
docker scan myacr.azurecr.io/myapp:latest
```

```bash
# Example of avoiding secrets in Dockerfiles (do not bake secrets)
# BAD: embedding secrets
ENV API_KEY=super-secret-key

# GOOD: pass at runtime or use a secret manager
# Docker run example (not for production); in production, use env vars from a secret store
docker run -p 3000:3000 -e API_BASE_URL=https://api.example.com myapp:latest
```

```bash
# Basic hardening techniques in Dockerfile
FROM node:18-alpine
RUN addgroup -S app && adduser -S -G app app
USER app
```

### Line-by-line explanation breaking down each line (for the code blocks)

- docker scan
  - Uses the built-in or plugin-based scanner to detect vulnerabilities and misconfigurations in the image before deploying.
- ENV API_KEY=...
  - Demonstrates a common anti-pattern: embedding secrets in images; always avoid this.
- docker run -e API_BASE_URL=...
  - Demonstrates passing runtime configuration via environment variables (prefer secrets management for sensitive data).
- USER app
  - Drops privileges by running as a non-root user, reducing the impact of a potential compromise.

## 5. Secrets, Configuration, and Reproducibility in Containers

How to manage configuration, secrets, and reproducibility without leaking credentials.

```Dockerfile
FROM node:18-alpine
WORKDIR /app
ARG API_BASE_URL
ENV API_BASE_URL=${API_BASE_URL}
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
# Build with a build-arg for non-secret configuration
docker build --build-arg API_BASE_URL=https://api.example.com -t myapp:1.0 .
```

```text
# .env-like approach (not committed): store secrets securely and pass at runtime
# Use a secret store or CI/CD secret store to populate env files or environment variables
```

### Line-by-line explanation breaking down each line

- ARG API_BASE_URL
  - Declares a build-time variable that can be overridden at build time.
- ENV API_BASE_URL=${API_BASE_URL}
  - Exposes the ARG as an environment variable at runtime (read-only for runtime).
- docker build --build-arg API_BASE_URL=...
  - Demonstrates how to supply the build-time value safely from CI/CD or a secure pipeline variable.
- The .env-like approach note
  - Emphasizes that secret material should not be checked into code; use CI/CD secret stores or Key Vault.

## 6. Deployment Patterns: AKS, App Service, and Service Mesh Basics

Deploy containers to Azure and expose them to users, while handling traffic, scaling, and secrets properly.

```yaml
# Minimal Kubernetes manifest for AKS deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: myacr.azurecr.io/myapp:latest
        ports:
        - containerPort: 3000
        env:
        - name: API_BASE_URL
          value: "https://api.example.com"
```

```yaml
# Service to expose the deployment
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: myapp
```

### Line-by-line explanation breaking down each line

- Deployment metadata and spec
  - Defines a scalable, declarative workload.
- replicas: 2
  - Ensures two instances for basic redundancy.
- image: myacr.azurecr.io/myapp:latest
  - Uses the image pushed to ACR; ensure AKS has proper imagePullSecrets if ACR is private.
- env: API_BASE_URL
  - Passes runtime configuration to containers.
- Service type: LoadBalancer
  - Exposes the app to external clients via a cloud load balancer; in dev you might use NodePort or Ingress.

kubectl usage and cluster integration notes:
- az aks get-credentials --resource-group <rg> --name <aks-cluster>
  - Authenticates kubectl to the AKS cluster.
- kubectl apply -f k8s/
  - Applies deployment and service manifests.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

1) Storing secrets in Dockerfile or image layers
- Bad:
```Dockerfile
ENV DB_PASSWORD=supersecret
```
- Good:
```Dockerfile
# Do not bake secrets into images. Use runtime env or secret stores.
```

2) Not using .dockerignore, bloating images
- Bad:
```text
COPY . .
```
- Good:
```text
# .dockerignore example
node_modules
dist
.git
```

3) Not pinning dependencies
- Bad:
```bash
RUN npm install
```
- Good:
```bash
RUN npm ci
# Or use package-lock.json and pin exact versions
```

4) Skipping multi-stage builds
- Bad:
```Dockerfile
FROM node:18
COPY . .
RUN npm install
EXPOSE 3000
CMD ["node", "server.js"]
```
- Good:
```Dockerfile
# See Section 2 for multi-stage example
```

5) Missing health checks and non-root user
- Bad:
```Dockerfile
# No HEALTHCHECK and runs as root
CMD ["node", "server.js"]
```
- Good:
```Dockerfile
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:3000/health || exit 1
USER app
```

## Y. Why This Matters In Real Systems — production context and real usage

- Reproducibility: Docker images capture exact runtime environments; builds are repeatable across machines and stages.
- Immutable deployments: Each deploy uses a specific image tag; rollbacks are simple by swapping image tags.
- Security posture: Regular scanning (CI/CD), minimal base images, and not baking secrets reduce risk.
- Operational reliability: Multi-stage builds reduce attack surface and image size; Kubernetes/AKS provides self-healing, scaling, and rolling updates.
- Observability and governance: Image provenance, scan reports, and signed images enable compliance and traceability.

## Z. Study Questions — 5 recall questions

1) What is the purpose of a multi-stage Dockerfile, and how does it improve production images?
2) How do you push a Docker image to Azure Container Registry (ACR) from a CI/CD pipeline?
3) What is the difference between ARG and ENV in a Dockerfile, and when would you use each?
4) How can you deploy a containerized app to AKS, and what steps are required to access the cluster from your workstation?
5) Why is it important to exclude sensitive data from Docker images, and what are safe alternatives for providing secrets at runtime?

## Exercise — Practical multi-part coding challenge

Part A: Create and dockerize a tiny Node.js app
- Build a simple Express server (or use your existing app) that exposes a /health endpoint and a root endpoint.
- Dockerize it using a minimal Dockerfile (preferably a multi-stage build in Part B).

Part B: Implement a production-ready multi-stage Dockerfile
- Create a Dockerfile that uses multi-stage builds to produce a small runtime image.
- Ensure the runtime image does not include dev dependencies or build tools.
- Add a HEALTHCHECK to verify liveness of the app.

Part C: Push to Azure Container Registry (ACR)
- Create or use an existing ACR named myacr (or replace with your own).
- Build and push the image with a unique tag (e.g., 1.0.0 or BuildId-XYZ).
- Include a note about configuring a service connection in Azure DevOps or your CI tool for authentication.

Part D: Setup a minimal Azure Pipelines YAML to build and push
- Write a small azure-pipelines.yml snippet that:
  - Triggers on main
  - Builds the Docker image using the provided Dockerfile
  - Pushes to ACR
  - Optionally runs a basic image scan as part of the pipeline

Part E: Deploy to AKS (or App Service for Containers)
- Provide a simple Kubernetes deployment and service manifest that:
  - Pulls the image from ACR
  - Exposes the app on a LoadBalancer
  - Sets an environment variable like API_BASE_URL
- Include commands to connect to AKS (az aks get-credentials) and apply manifests (kubectl apply -f k8s/).

Part F: Verification and rollback plan
- Describe how to verify the deployment (kubectl get pods, logs, endpoint access).
- Outline a rollback plan by re-applying a manifest or using an earlier image tag.

Note: Adapt resource names, registry names, and cluster details to your environment. This lesson provides concrete templates you can copy, customize, and integrate into your Azure-centric CI/CD workflows.