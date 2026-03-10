# Docker Deep Dive in Kubernetes Platform — Phase 2: Containers & CI/CD

Containers are the building blocks of modern DevOps pipelines. Docker provides a lightweight, consistent, and portable runtime for packaging applications and their dependencies. In Kubernetes-based platforms, Docker (as the image format and runtime) enables predictable deployments, reproducible builds, and scalable operations. This lesson dives deep into Docker fundamentals, best practices, security considerations, and how Docker fits into CI/CD workflows in real-world Kubernetes environments.

## 1. Docker Essentials: Building and Running a Container Locally

This section covers a minimal end-to-end example: packaging a small Python Flask app into a Docker image and running it locally. You’ll learn how a container encapsulates code and runtime, making it easy to reproduce on any host or in a cluster.

Code: app.py
```python
from flask import Flask
import os

app = Flask(__name__)
PORT = int(os.environ.get("PORT", 5000))

@app.route("/")
def hello():
    return "Hello from Dockerized Flask in Kubernetes!"

if __name__ == "__main__":
    # Bind to all interfaces inside the container
    app.run(host="0.0.0.0", port=PORT)
```

Code: requirements.txt
```
flask
```

Code: Dockerfile
```dockerfile
# Use a lightweight Python runtime as the base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Environment variable for the port (default 5000)
ENV PORT=5000

# Expose the port the app runs on
EXPOSE 5000

# Run the application
CMD ["python", "app.py"]
```

Code: Docker commands (build and run)
```bash
# Build the image
docker build -t flask-docker-demo .

# Run the container locally (maps host port 8080 to container 5000)
docker run -p 8080:5000 flask-docker-demo
```

### Line-by-line Explanation

app.py
- Line 1-3: Import Flask and OS to access environment variables.
- Line 5: Create a Flask application instance.
- Line 6: Read PORT from environment or default to 5000.
- Line 8-10: Define a single route ("/") that returns a plain text message.
- Line 12-16: If the script is the main module, start the Flask dev server on 0.0.0.0 (inside the container) and on the specified port.

requirements.txt
- Line 1: Declare Flask as a dependency for the Python app.

Dockerfile
- Line 2: Use Python 3.11 slim as the runtime base image for a small footprint.
- Line 5: Set the working directory to /app inside the container.
- Line 8-9: Copy requirements.txt and install Python dependencies.
- Line 12-13: Copy the application code into the container.
- Line 16: Set an environment variable PORT with a default value.
- Line 19: Expose port 5000 so Docker and orchestrators know the port the app listens on.
- Line 22: Command to run the Flask app when the container starts.

docker build and docker run
- The build command creates an image named flask-docker-demo.
- The run command starts a container mapping host port 8080 to container port 5000, enabling access at http://localhost:8080.

## 2. Dockerfile Best Practices: Multi-Stage Builds and Image Size

Multi-stage builds help reduce the final image size by separating build-time and runtime dependencies. This section shows how to produce a lean runtime image for a Python app while preserving a convenient build stage for dependency installation.

Code: Dockerfile.multi
```dockerfile
# 0) Builder stage: install dependencies and prepare artifacts
FROM python:3.11-slim AS builder
WORKDIR /app

# Install build-time dependencies (if any) and Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# 1) Runtime stage: lean image with only runtime dependencies
FROM python:3.11-slim
WORKDIR /app

# Copy site-packages from the builder stage to avoid reinstalling dependencies
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages/

# Copy application code from builder
COPY --from=builder /app /app

ENV PORT=5000
EXPOSE 5000

CMD ["python", "app.py"]
```

Code: Build & run multi-stage image
```bash
docker build -t flask-docker-demo:multi-stage -f Dockerfile.multi .
docker run -p 8081:5000 flask-docker-demo:multi-stage
```

### Line-by-line Explanation

Dockerfile.multi
- Lines 1-3: Define the builder stage named "builder" using Python 3.11 slim and set the working directory.
- Lines 6-9: Copy requirements.txt and install dependencies in the builder stage.
- Line 12: Copy the application code into the builder stage.
- Lines 15-22: Define the runtime stage using a fresh Python 3.11 slim image; this stage minimizes the final image by reusing the installed site-packages from the builder, avoiding duplication of dependencies.
- Line 18: Copy dependencies from the builder to the runtime image.
- Line 21-22: Copy the application code into the runtime image.
- Lines 24-26: Set the port and expose it, so orchestrators know how to route to the container.
- Line 28: Command to run the app when the container starts.

Build & Run
- Line 1: Build the image using the multi-stage Dockerfile.
- Line 2: Run the container, mapping host port 8081 to container port 5000.

## 3. Docker Registries, Tagging, and Security Scanning

In production, images are stored in registries and scanned for vulnerabilities before deployment. This section covers tagging, pushing to a registry, and basic security scanning practices (e.g., using Trivy) and image signing for trust.

Code: Registry operations and scanning
```bash
# Authenticate to a registry (example with Docker Hub)
docker login

# Build and tag the image for a registry
docker build -t myorg/hello-flask:1.0.0 .

# Push the image to the registry
docker push myorg/hello-flask:1.0.0

# Scan the image for vulnerabilities (basic example using Trivy)
trivy image myorg/hello-flask:1.0.0

# Sign the image (cosign) for integrity (requires key pair)
# cosign generate-key-pair
cosign sign -key cosign.key ghcr.io/myorg/hello-flask:1.0.0
```

### Line-by-line Explanation

docker login
- Line 1: Authenticate to your container registry so you can push images. You’ll be prompted for credentials.

docker build -t myorg/hello-flask:1.0.0 .
- Line 1: Build the image and tag it with a specific semantic version (1.0.0) for traceability.
- Line 2: The Dockerfile used is inferred from the current directory.

docker push myorg/hello-flask:1.0.0
- Line 1: Push the tagged image to the registry you logged into.

trivy image myorg/hello-flask:1.0.0
- Line 1: Run a vulnerability scan against the pushed image to identify known security issues.

cosign sign -key cosign.key ghcr.io/myorg/hello-flask:1.0.0
- Line 1: Sign the image with a cryptographic signature to prove integrity and provenance; requires a private key (cosign.key).

Note: In real environments, you’d also automate scanning and signing in CI/CD pipelines and enforce image digest pinning in deployments.

## 4. Kubernetes: Deploying Docker Images

Docker images are deployed in Kubernetes via manifests such as Deployments and Services. This section shows a sample Deployment and Service that run the Flask app image, including readiness and liveness probes, resource requests/limits, and a simple ClusterIP service.

Code: deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-flask
  labels:
    app: hello-flask
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hello-flask
  template:
    metadata:
      labels:
        app: hello-flask
    spec:
      containers:
        - name: hello-flask
          image: myorg/hello-flask:1.0.0
          ports:
            - containerPort: 5000
          readinessProbe:
            httpGet:
              path: /
              port: 5000
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /
              port: 5000
            initialDelaySeconds: 15
            periodSeconds: 20
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
```

Code: service.yaml
```yaml
apiVersion: v1
kind: Service
metadata:
  name: hello-flask-service
spec:
  selector:
    app: hello-flask
  ports:
    - protocol: TCP
      port: 80
      targetPort: 5000
  type: ClusterIP
```

### Line-by-line Explanation

deployment.yaml
- apiVersion, kind, metadata: Define a Deployment named hello-flask with a label.
- spec.replicas: Run 3 pod replicas to ensure availability and load distribution.
- spec.selector & template.metadata.labels: Identify pods managed by this Deployment.
- template.spec.containers: Define the container to run in each pod.
- image: myorg/hello-flask:1.0.0: The image to deploy; ensure the tag matches your registry.
- ports.containerPort: Inside the pod, the application listens on port 5000.
- readinessProbe: A quick check (HTTP GET on /) to ensure the container is ready to receive traffic.
- livenessProbe: Periodic health check to determine if the container should be restarted.
- resources: Request and limit CPU/memory to manage cluster scheduling and fair use.

service.yaml
- apiVersion, kind, metadata: Define a Service named hello-flask-service.
- spec.selector: Routes traffic to pods labeled app: hello-flask.
- ports: Expose port 80 on the service and map to container port 5000.
- type: ClusterIP, which exposes the service inside the cluster.

## 5. CI/CD Integration: Automating Docker Builds and Deployments

CI/CD pipelines automate the build, test, scan, sign, push, and deployment steps. This section provides a GitHub Actions workflow example that builds a Docker image on push to main, pushes to a registry, runs a vulnerability scan, signs the image, and updates a Kubernetes deployment using kubectl.

Code: .github/workflows/docker-image.yml
```yaml
name: CI / CD - Docker build, scan, and deploy

on:
  push:
    branches: [ main ]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up QEMU (for cross-arch builds if needed)
        uses: docker/setup-qemu-action@v2

      - name: Log in to registry
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      - name: Build and push image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: myorg/hello-flask:1.0.0

      - name: Trivy image scan
        run: |
          docker pull myorg/hello-flask:1.0.0
          trivy image myorg/hello-flask:1.0.0

      - name: Cosign sign image
        uses: samuelmeuli/cosign-action@v2
        with:
          image: ghcr.io/myorg/hello-flask:1.0.0
          key: ${{ secrets.COSIGN_KEY }}

      - name: Update Kubernetes deployment (kubectl)
        uses: azure/k8s-bpi@v0.0.7
        with:
          method: kubectl
          args: set image deployment/hello-flask hello-flask=myorg/hello-flask:1.0.0
```

### Line-by-line Explanation

- Workflow triggers on pushes to main to enable automatic CI/CD for production-like behavior.
- Checkout: Retrieves the repository contents to the runner.
- Set up QEMU: Optional step enabling cross-architecture builds if you support multiple arches.
- Log in to registry: Authenticate to your container registry so the runner can push images.
- Build and push image: Uses the docker/build-push-action to build the image and push it to the registry with the tag 1.0.0.
- Trivy image scan: Pulls the built image and runs a vulnerability scan; fails if critical issues exist (depending on your policy).
- Cosign sign image: Signs the image to provide provenance; requires a Cosign private key stored in GitHub Secrets.
- Update Kubernetes deployment: Kubectl-based step to update the Deployment with the new image, triggering rolling updates in the cluster.

## 6. X. Common Beginner Mistakes

Bad vs Good code: Side-by-side examples of frequent mistakes and how to fix them.

### Mistake 1: Not pinning image tags
| Bad | Good |
|---|---|
| ```yaml\n# docker-compose.yml\nservices:\n  app:\n    image: myorg/app:latest\n``` | ```yaml\ndocker image: myorg/app:1.0.0\n``` |

### Mistake 2: Running as root; not setting a non-root user
| Bad | Good |
|---|---|
| ```dockerfile\nFROM python:3.11-slim\nWORKDIR /app\nCOPY . .\nCMD ["python","app.py"]\n``` | ```dockerfile\nFROM python:3.11-slim\nRUN useradd -m appuser\nUSER appuser\nWORKDIR /home/appuser\nCOPY --chown=appuser:appuser . .\nCMD ["python","app.py"]\n``` |

### Mistake 3: Missing HEALTHCHECK / Kubernetes probes
| Bad | Good |
|---|---|
| ```dockerfile\nFROM node:18-alpine\nWORKDIR /app\nCOPY package.json .\nRUN npm install\nCOPY . .\nCMD ["node","server.js"]\n``` | ```dockerfile\nFROM node:18-alpine\nWORKDIR /app\nCOPY package.json .\nRUN npm install\nCOPY . .\nHEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:3000/ || exit 1\nUSER node\nCMD [\"node\",\"server.js\"]\n``` |

### Mistake 4: Not using multi-stage builds for production images
| Bad | Good |
|---|---|
| ```dockerfile\nFROM python:3.11-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install -r requirements.txt\nCOPY . .\nCMD [\"python\",\"app.py\"]\n``` | ```dockerfile\nFROM python:3.11-slim AS builder\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nFROM python:3.11-slim\nWORKDIR /app\nCOPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages/\nCOPY --from=builder /app /app\nCMD [\"python\",\"app.py\"]\n``` |

## 7. Y. Why This Matters In Real Systems

- Reproducibility: Container images ensure the same runtime across development, staging, and production, reducing “it works on my machine” issues.
- Reliability and uptime: Kubernetes readiness and liveness probes, combined with properly pinned image tags and health checks, enable automated rollouts, self-healing, and rapid recovery from failures.
- Security and compliance: Regular vulnerability scanning, image signing, and policy enforcement help you detect and mitigate security risks early in the pipeline.
- Scalability and efficiency: Multi-stage builds reduce image sizes, speeding up downloads, CI build times, and cluster scheduling; this improves overall system throughput and reduces resource consumption.
- Operational control: Centralized image registries, versioned tags, and automated CI/CD workflows provide auditable, repeatable deployment processes, enabling safer, faster releases.

## 8. Z. Study Questions

1) What is the purpose of a multi-stage Dockerfile, and how does it improve image size?
2) How do readinessProbe and livenessProbe differ in Kubernetes, and why are they important for containerized apps?
3) What are the advantages and risks of pinning image tags versus using the latest tag?
4) Describe a simple CI/CD flow for Docker images in a Kubernetes environment.
5) How can you verify that a Docker image has not only been built successfully but is also secure before deployment?

## 9. Exercise — Practical Multi-Part Coding Challenge

Goal: Build, secure, and deploy a small containerized web app to a Kubernetes cluster, and wire it into a basic CI/CD pipeline.

Part A. Build and containerize a Python Flask app
- Implement a small Flask app (or reuse app.py from Section 1) that exposes at least one endpoint (e.g., /health and /).
- Create a Dockerfile using a multi-stage approach to produce a lean runtime image.
- Build and run locally to verify the endpoint is reachable at http://localhost:8080/.

Part B. Write Kubernetes manifests
- Create a Deployment (3 replicas) that uses the image myorg/hello-flask:1.0.0.
- Add a Service (ClusterIP) to expose the app internally on port 80.
- Include at least one readiness probe and one liveness probe.

Part C. Add a basic CI/CD workflow
- Implement a GitHub Actions workflow that:
  - Builds the Docker image on push to main.
  - Tags the image with 1.0.0 and pushes it to your registry.
  - Scans the image with Trivy.
  - Signs the image with Cosign (assuming a key is configured in secrets).
  - Updates the Kubernetes Deployment with the new image (kubectl set image).

Part D. Security and best practices
- Ensure the Dockerfile does not run as root; use a non-root user.
- Use a non-root runtime image and a multi-stage build.
- Pin the image tag in Kubernetes manifests and CI/CD processes.
- Add a HEALTHCHECK and Kubernetes probes to ensure robust health management.

Part E. Reflection and extension
- Explain how you would adapt this pipeline for a private registry (e.g., Harbor) and how to integrate with Kubernetes RBAC and admission controllers for image policies.
- Propose improvements for production readiness (e.g., image digest pinning in deployments, automated rollbacks, and canary deployments).

End of lesson.