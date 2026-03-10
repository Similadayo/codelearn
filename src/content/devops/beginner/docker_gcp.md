# Docker Deep Dive for Google Cloud: Phase 2 — Containers & CI/CD

Containers are the unit of deployment in modern DevOps. Docker provides lightweight, portable, and repeatable build environments that run consistently across development, CI/CD pipelines, and production. In Google Cloud, Docker underpins Cloud Run, GKE, Cloud Build, and Artifact Registry, enabling scalable, secure, and auditable software delivery pipelines. This lesson dives into the core Docker concepts, best practices, and practical integration patterns with Google Cloud services.

## 1. Docker Fundamentals and Images

What you build in Docker is an image: a layered, immutable file system with a runtime. A container is a running instance of an image. Images are built from a Dockerfile, which describes the steps to assemble the image.

Code examples show a tiny FastAPI app, its requirements, and a simple Dockerfile to containerize it.

```python
# app.py
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello from Dockerized FastAPI on Google Cloud!"}
```

```text
# requirements.txt
fastapi
uvicorn[standard]
```

```dockerfile
# Dockerfile
FROM python:3.11-slim
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Run the app with Uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
```

### Line-by-line explanation
- FROM python:3.11-slim: Start from a lightweight Python base image.
- WORKDIR /app: Set the working directory inside the image for subsequent commands.
- COPY requirements.txt .: Copy dependency spec into the image.
- RUN pip install --no-cache-dir -r requirements.txt: Install dependencies without caching to reduce image size.
- COPY . .: Copy the application code into the image.
- EXPOSE 8080: Document that the app listens on port 8080.
- CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]: Run the FastAPI app with Uvicorn when a container starts.

## 2. Dockerfile Deep Dive: Multi-Stage Builds and Security

Multi-stage builds help shrink final image size and improve security by separating build-time dependencies from runtime.

```dockerfile
# Dockerfile (multi-stage)
# Builder stage: install dependencies
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Runtime stage: minimal image, only what's needed to run
FROM python:3.11-slim
WORKDIR /app

# Copy only the needed artifacts from the builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /app /app

# Run as a non-root user for better security
RUN groupadd -r app && useradd -r -g app app
USER app

EXPOSE 8080
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
```

### Line-by-line explanation
- FROM python:3.11-slim as builder: Create a named stage "builder" to install dependencies.
- WORKDIR /app: Set the workspace in the builder stage.
- COPY requirements.txt . and RUN pip install --no-cache-dir -r requirements.txt: Install dependencies in the builder stage.
- COPY . .: Copy application code into the builder stage.
- FROM python:3.11-slim: Start the final runtime image.
- WORKDIR /app: Set runtime working directory.
- COPY --from=builder ...: Copy only the necessary Python packages from the builder into the runtime image.
- COPY --from=builder /app /app: Copy application code to runtime image.
- RUN groupadd -r app && useradd -r -g app app; USER app: Create and run as a non-root user for security.
- EXPOSE 8080 and CMD ...: Expose port and run the app.

## 3. Building Images and Pushing to Google Artifact Registry

Google Cloud uses Artifact Registry (or GCR) to store container images. The typical flow is: build locally or in CI, then push to Artifact Registry, then deploy to Cloud Run or GKE.

```bash
# Shell variables (edit for your project)
PROJECT_ID="my-gcp-project"
LOCATION="us-central1"
REPO="docker"
IMAGE_NAME="my-app"

# Enable required services (one-time)
gcloud services enable artifactregistry.googleapis.com

# Create a Docker repository (one-time)
gcloud artifacts repositories create "$REPO" \
  --repository-format=docker \
  --location="$LOCATION"

# Authenticate Docker to Artifact Registry
gcloud auth configure-docker "$LOCATION-docker.pkg.dev"

# Build the image locally
docker build -t "$LOCATION-docker.pkg.dev/$PROJECT_ID/$REPO/$IMAGE_NAME:latest" .
```

```bash
# Push the image to Artifact Registry
docker push "$LOCATION-docker.pkg.dev/$PROJECT_ID/$REPO/$IMAGE_NAME:latest"
```

```yaml
# cloudbuild.yaml (example)
steps:
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', '${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:${SHORT_SHA}', '.']
- name: 'gcr.io/cloud-builders/docker'
  args: ['push', '${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:${SHORT_SHA}']

images:
- '${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:${SHORT_SHA}'

substitutions:
  LOCATION: us-central1
  PROJECT_ID: my-gcp-project
  REPO: docker
  IMAGE_NAME: my-app
```

### Line-by-line explanation
- The artifact registry commands configure Docker authentication and create a Docker repository in the selected location.
- The docker build and docker push commands build the image and push it to Artifact Registry in the specified path.
- cloudbuild.yaml defines a Cloud Build pipeline that builds the image with a short SHA tag and pushes it to Artifact Registry, and lists the image to be published.

## 4. Running Containers in Google Cloud: Cloud Run or GKE

Once you have an image in Artifact Registry, you can deploy it to Cloud Run (fully managed) or GKE (Kubernetes).

Cloud Run (fully managed) deployment:
```bash
LOCATION="us-central1"
PROJECT_ID="my-gcp-project"
REPO="docker"
IMAGE_NAME="my-app"

IMAGE_PATH="${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:latest"

gcloud run deploy my-app \
  --image "$IMAGE_PATH" \
  --region "$LOCATION" \
  --platform managed \
  --allow-unauthenticated
```

Kubernetes (GKE) deployment example:
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-app
        image: us-central1-docker.pkg.dev/my-gcp-project/docker/my-app:latest
        ports:
        - containerPort: 8080
```

```yaml
# service.yaml (ClusterIP service)
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  selector:
    app: my-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
```

Command to apply:
```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl get pods
```

### Line-by-line explanation
- Cloud Run deploy: The command pushes the container image from Artifact Registry to a Cloud Run service, generating a scalable serverless endpoint.
- GKE deployment: The Deployment ensures the specified number of pods run, each pulling the container image from Artifact Registry.

## 5. CI/CD Integration with Cloud Build and Cloud Run

Automating build, test, and deploy with Cloud Build accelerates delivery and ensures reproducibility.

```yaml
# cloudbuild.yaml (build + deploy to Cloud Run)
steps:
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', '${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:${SHORT_SHA}', '.']
- name: 'gcr.io/cloud-builders/docker'
  args: ['push', '${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:${SHORT_SHA}']
- name: 'gcr.io/cloudsdktool/cloud-sdk'
  entrypoint: 'bash'
  args:
  - '-c'
  - |
    gcloud run deploy ${IMAGE_NAME} \
      --image ${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:${SHORT_SHA} \
      --region ${LOCATION} --platform managed --allow-unauthenticated

images:
- '${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:${SHORT_SHA}'

substitutions:
  LOCATION: us-central1
  PROJECT_ID: my-gcp-project
  REPO: docker
  IMAGE_NAME: my-app
```

CI/CD trigger example:
```bash
# Create a Cloud Build trigger for pushes to main
gcloud builds triggers create github \
  --name="deploy-my-app" \
  --repo-name="my-repo" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml"
```

### Line-by-line explanation
- Cloud Build steps build and push the image to Artifact Registry, then deploy to Cloud Run using gcloud.
- The images: field ensures Cloud Build publishes the built image tag to the registry.
- The trigger wiring automates the pipeline on code changes (e.g., pushes to main).

## X. Common Beginner Mistakes

Bad vs Good examples to highlight real pitfalls and how to fix them.

- Mistake 1: Using latest base images (no pinning)
  - Bad:
    ```dockerfile
    FROM python:latest
    ```
  - Good:
    ```dockerfile
    FROM python:3.11.4-slim
    ```

- Mistake 2: Embedding secrets in images
  - Bad:
    ```dockerfile
    # Dockerfile
    FROM node:18
    ENV DB_PASSWORD=supersecret
    ```
  - Good:
    ```dockerfile
    # Dockerfile
    FROM node:18
    # Do not hard-code secrets. Use runtime env or Secret Manager.
    ```
  - Runtime fix (Cloud Run/AE): gcloud run deploy ... --set-env-vars DB_PASSWORD="${DB_PASSWORD}" or use Cloud Secret Manager.

- Mistake 3: Not cleaning up build dependencies
  - Bad:
    ```dockerfile
    FROM buildpack-deps
    RUN apt-get update && apt-get install -y build-essential
    ```
  - Good:
    ```dockerfile
    FROM buildpack-deps
    RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
      && rm -rf /var/lib/apt/lists/*
    ```

- Mistake 4: Creating too many layers and not leveraging multi-stage builds
  - Bad:
    ```dockerfile
    FROM python:3.11-slim
    RUN apt-get update
    RUN apt-get install -y build-essential
    COPY . /app
    RUN pip install -r /app/requirements.txt
    ```
  - Good:
    ```dockerfile
    FROM python:3.11-slim as builder
    WORKDIR /app
    COPY requirements.txt .
    RUN pip install --no-cache-dir -r requirements.txt
    COPY . .
    FROM python:3.11-slim
    WORKDIR /app
    COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
    COPY --from=builder /app /app
    ```

- Mistake 5: Not aligning dev/prod environments
  - Bad:
    ```dockerfile
    ENV APP_ENV=development
    ```
  - Good:
    ```dockerfile
    # Dockerfile (production)
    ENV APP_ENV=production
    ```
  - Use runtime configs or Cloud Run configurations to override as needed.

## Y. Why This Matters In Real Systems

- Reproducibility: Docker images ensure the same software stack, dependencies, and configuration across dev, CI, and production.
- Isolation and security: Least-privilege containers with non-root users and proper base images reduce blast radius.
- Scalability: Containerized workloads enable rapid horizontal scaling with Cloud Run or Kubernetes.
- Observability and compliance: Images integrate with Artifact Registry scanning, vulnerability reports, and policy enforcement, enabling auditable pipelines.
- Operational efficiency: CI/CD automation reduces manual steps, decreases drift, and speeds delivery while maintaining quality gates.

## Z. Study Questions

1) What is the difference between a Docker image and a Docker container?  
2) Why are multi-stage builds beneficial for production images?  
3) How do you push a Docker image to Google Artifact Registry?  
4) How can you deploy the same container image to both Cloud Run and GKE?  
5) What are two best practices to avoid common security pitfalls when containerizing apps?

## Exercise

A practical, end-to-end exercise to containerize a small app, publish to Google Cloud, and deploy to Cloud Run.

Part A — Create a small FastAPI app and containerize it
- Implement a minimal FastAPI app (already provided in this lesson as app.py).
- Create a production-ready Dockerfile using a multi-stage build (as shown in Section 2).

Code to add (example):
```python
# app.py
from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def read_root():
    return {"message": "Hello from the exercise app on Cloud Run!"}
```

```text
# requirements.txt
fastapi
uvicorn[standard]
```

```dockerfile
# Dockerfile (multi-stage, production-ready)
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /app /app
RUN groupadd -r app && useradd -r -g app app
USER app
EXPOSE 8080
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
```

Part B — Build and push to Google Artifact Registry
- Use your Google Cloud project, location, and repository to build and push.
- Complete the following steps in Cloud Shell or your dev machine (adjust PROJECT_ID, LOCATION, REPO, IMAGE_NAME accordingly).

```bash
PROJECT_ID="your-gcp-project"
LOCATION="us-central1"
REPO="docker"
IMAGE_NAME="exercise-app"

gcloud services enable artifactregistry.googleapis.com
gcloud artifacts repositories create "$REPO" --repository-format=docker --location="$LOCATION"

gcloud auth configure-docker "$LOCATION-docker.pkg.dev"

docker build -t "$LOCATION-docker.pkg.dev/$PROJECT_ID/$REPO/$IMAGE_NAME:latest" .
docker push "$LOCATION-docker.pkg.dev/$PROJECT_ID/$REPO/$IMAGE_NAME:latest"
```

Part C — Deploy to Cloud Run
- Deploy the image to Cloud Run in a region of your choice.

```bash
IMAGE_PATH="${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:latest"

gcloud run deploy exercise-app \
  --image "$IMAGE_PATH" \
  --region "$LOCATION" \
  --platform managed \
  --allow-unauthenticated
```

Part D — Optional: Add a Cloud Build pipeline (optional extension)
- Create a cloudbuild.yaml (see Section 3 for structure) and set up a trigger to automatically build and deploy on pushes to main.

Deliverables and guidance
- Ensure you can access the Cloud Run URL and verify responses from curl requests.
- Validate that the image is stored in Artifact Registry and that the Cloud Run service is serving traffic.
- Reflect on the security and compliance considerations you would apply in a real project (secrets management, image scanning, minimal base images, and non-root containers).

If you’d like, I can tailor this lesson to a specific language or framework (e.g., Node.js, Go) or to your exact Google Cloud project setup (VPC, IAM roles, Cloud Build triggers).