# GitHub Actions & GitLab CI Pipelines for Kubernetes

CI/CD pipelines are the automation backbone that moves software from code to running service in Kubernetes. This lesson focuses on two popular modern CI/CD platforms—GitHub Actions and GitLab CI—and how to wire them into a Kubernetes deployment flow. You’ll learn how to build container images, push to a registry, and apply Kubernetes manifests in a repeatable, secure, and observable way. Mastery here enables faster iteration, safer deployments, and robust operations in real-world cloud-native environments.

## 1. CI/CD in Kubernetes: Goals and Architecture

In Kubernetes environments, CI/CD pipelines automate:
- Building container images from code
- Storing/versioning images in a registry
- Deploying or updating Kubernetes resources (Deployments, Services, Ingress)
- Verifying deployment health and rolling back if needed

Key concepts:
- Idempotent manifests: Re-applying manifests should converge to the desired state
- Image promotion: Build -> test -> stage -> prod with proper tagging
- Secrets and credentials management: Avoid hard-coding; leverage secret stores
- Rollouts and observability: Use kubectl rollout status, health checks, and status reporting

Code you’ll see in later sections exemplifies how to chain these steps in both GitHub Actions and GitLab CI, while keeping the Kubernetes manifests clean and reusable.

---

## 2. ## 1. GitHub Actions Fundamentals for Kubernetes

This section demonstrates a practical GitHub Actions workflow that builds a Docker image, pushes it to a registry, then updates a Kubernetes Deployment with the new image and waits for the rollout to complete.

```yaml
name: CI/CD to Kubernetes
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Docker Buildx (optional but recommended for multi-arch)
        uses: docker/setup-qemu-action@v3
        with:
          platforms: linux/amd64,linux/arm64

      - name: Log in to container registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
          tags: |
            ghcr.io/${{ github.repository }}:latest
            ghcr.io/${{ github.repository }}:${{ github.sha }}

      - name: Install kubectl
        run: |
          curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
          chmod +x kubectl
          sudo mv kubectl /usr/local/bin

      - name: Set up kubeconfig
        env:
          KUBECONFIG_CONTENT: ${{ secrets.KUBECONFIG }}
        run: |
          mkdir -p $HOME/.kube
          echo "$KUBECONFIG_CONTENT" > $HOME/.kube/config

      - name: Deploy to Kubernetes
        run: |
          kubectl apply -f k8s/                # Apply manifests
          kubectl set image deployment/webapp webapp=ghcr.io/${{ github.repository }}:latest --record
          kubectl rollout status deployment/webapp --timeout=600s
```

### Line-by-line explanation
- name: CI/CD to Kubernetes — Defines the workflow name.
- on: push/pull_request — Triggers on pushes to main and PRs targeting main.
- jobs.build-and-push — A single job that runs on Ubuntu.
- actions/checkout@v4 — Checks out the repository so the workflow can access code and manifests.
- docker/setup-qemu-action@v3 — Enables building for multiple architectures (optional but helpful for portability).
- docker/login-action@v3 — Logs in to the container registry (GitHub Container Registry in this example) using the GitHub token.
- docker/build-push-action@v4 — Builds and pushes Docker images. Tags include latest and a commit SHA for traceability.
- Install kubectl — Installs kubectl on the runner so we can manipulate the cluster.
- Set up kubeconfig — Writes the kubeconfig from a secret to the runner’s environment to authenticate to the cluster.
- kubectl apply -f k8s/ — Applies Kubernetes manifests in the k8s directory.
- kubectl set image deployment/webapp webapp=ghcr.io/...:latest --record — Updates the Deployment’s container image to the newly built one.
- kubectl rollout status deployment/webapp —timeout=600s — Waits for the rollout to complete or times out.

Notes:
- KUBECONFIG stored in secrets.KUBECONFIG must be properly configured for the target cluster.
- The k8s/ directory should contain your Deployment and Service manifests (see Section 4 for examples).

---

## 3. ## 2. GitLab CI Fundamentals for Kubernetes

This section shows a pragmatic .gitlab-ci.yml that builds a Docker image, pushes it to the GitLab Container Registry, and deploys to Kubernetes using a kubeconfig stored as a protected CI/CD variable.

```yaml
stages:
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  IMAGE_TAG: $CI_REGISTRY_IMAGE:latest

image: docker:24.0

services:
  - docker:24.0-dind

before_script:
  - docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" $CI_REGISTRY

build:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE:latest .
    - docker push $CI_REGISTRY_IMAGE:latest
  only:
    - main

deploy:
  stage: deploy
  image: bitnami/kubectl:1.24
  script:
    - mkdir -p /root/.kube
    - echo "$KUBECONFIG" > /root/.kube/config
    - kubectl apply -f k8s/
    - kubectl set image deployment/webapp webapp=$CI_REGISTRY_IMAGE:latest --record
    - kubectl rollout status deployment/webapp --timeout=600s
  only:
    - main
```

### Line-by-line explanation
- stages: build, deploy — Defines the pipeline stages.
- variables: DOCKER_DRIVER and IMAGE_TAG — Sets default Docker storage driver and a tag helper.
- image: docker:24.0 — Uses a Docker-in-Docker capable image to run Docker commands.
- services: docker:dind — Enables Docker daemon inside the GitLab runner for building/pushing images.
- before_script: docker login — Authenticates to the GitLab container registry.
- build job:
  - docker build -t ...:latest . — Builds the image with the latest tag.
  - docker push ...:latest — Pushes the image to GitLab's registry.
- deploy job:
  - image: bitnami/kubectl:1.24 — Uses a kubectl-enabled image to interact with Kubernetes.
  - mkdir and echo "$KUBECONFIG" > /root/.kube/config — Stores kubeconfig from a protected CI/CD variable.
  - kubectl apply -f k8s/ — Applies manifests.
  - kubectl set image deployment/webapp webapp=...:latest — Updates the Deployment to the new image.
  - kubectl rollout status deployment/webapp —timeout=600s — Waits for rollout completion.

Notes:
- KUBECONFIG must be saved in GitLab as a protected CI/CD variable named KUBECONFIG.
- The k8s/ directory should contain your Kubernetes manifests (Deployment, Service, etc).

---

## 4. ## 3. Kubernetes Deployment Best Practices in CI/CD

To run in production, you’ll typically separate artifacts from deployment logic, support canary/blue-green strategies, and version your Kubernetes resources. Below are typical resources and best practices, plus example manifests.

Example Kubernetes Deployment manifest (Deployment and Service)

Deployment (k8s/deployment.yaml):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  labels:
    app: webapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: webapp
        image: ghcr.io/OWNER/REPO:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        readinessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
```

Service (k8s/service.yaml):
```yaml
apiVersion: v1
kind: Service
metadata:
  name: webapp
spec:
  type: ClusterIP
  selector:
    app: webapp
  ports:
  - port: 80
    targetPort: 8080
```

Notes:
- Image tag should be controlled by CI (e.g., latest, sha, or semantic tag). In production, pin images to immutable tags and promote them through environments.
- Readiness probes help ensure traffic only hits healthy pods.
- Consider using ConfigMaps/Secrets for config, and consider canary deployments for user-facing changes.

If you want canary deployments, you can add a canary Deployment alongside the primary and progressively shift traffic using a higher-level controller (e.g., Istio, Argo Rollouts) or Kubernetes native rollout strategies with replica adjustments and image variants.

---

## 5. ## X. Common Beginner Mistakes

Bad vs Good (3+ real pitfalls)

- Pitfall 1: Using image tag "latest" in production
  - Bad:
    - image: ghcr.io/OWNER/REPO:latest
  - Good:
    - image: ghcr.io/OWNER/REPO:${{ github.sha }} or ghcr.io/OWNER/REPO:${CI_COMMIT_SHORT_SHA}

- Pitfall 2: Storing secrets in code or logs
  - Bad:
    - export DOCKER_PASSWORD="secret"
    - echo $DOCKER_PASSWORD
  - Good:
    - Use built-in secret stores (GitHub Secrets, GitLab CI variables) and pass via environment or secrets actions only; never echoing secrets in logs.

- Pitfall 3: Not validating cluster connectivity before applying manifests
  - Bad:
    - kubectl apply -f k8s/
  - Good:
    - Check cluster context, verify namespace exists, and run a canary test before applying updates.
      - kubectl config use-context my-cluster
      - kubectl get nodes
      - kubectl apply -f k8s/ && kubectl rollout status deployment/webapp --timeout=600s

- Pitfall 4: Non-idempotent, recreate-heavy updates
  - Bad:
    - kubectl delete -f k8s/ && kubectl apply -f k8s/
  - Good:
    - Use kubectl apply for declarative updates and rely on rollout status to manage changes.

- Pitfall 5: Ignoring security/policy controls
  - Bad:
    - Running builds with root access to the runner and exposing kubeconfig in logs
  - Good:
    - Run runners in least-privilege contexts, use minimal base images, and store credentials in secrets with tight scoping.

---

## 6. ## Y. Why This Matters In Real Systems

- Reliability and repeatability: CI/CD pipelines reproduce identical builds and deployments, reducing drift between environments.
- Safer rollouts: Automated canaries, rollbacks, and health checks reduce the blast radius of failures.
- Security posture: Secrets management, ephemeral runners, and least privilege access help meet compliance requirements.
- Observability: Pipelines emit logs, statuses, and events to help operators diagnose failures quickly.
- Collaboration and velocity: Git-backed workflows enable traceability, reviews, and faster delivery cycles without sacrificing stability.

In production, teams commonly:
- Pin image tags to immutable versions promoted through environments (dev -> staging -> prod)
- Use canary or blue/green deployment strategies to minimize user impact
- Integrate tests, security scans, and policy checks into the CI/CD pipeline
- Audit deployments with rollout status, status checks, and monitoring dashboards

---

## Z. Study Questions

1. What are the primary advantages of tagging container images with a commit SHA versus “latest” in a CI/CD workflow?
2. How do kubectl rollout status commands help you verify a deployment, and why is it important in CI pipelines?
3. Why is it important to store kubeconfig and registry credentials in secrets rather than hard-coding them in your YAML files?
4. Describe two strategies for deploying updates to a running application in Kubernetes without causing downtime.
5. What is an idempotent operation in the context of Kubernetes manifests, and why is it essential for CI/CD?

---

## Exercise

Goal: Build a small, end-to-end CI/CD flow for a Kubernetes-hosted web app using either GitHub Actions or GitLab CI, with a simple Kubernetes manifest and a canary-friendly deployment approach.

Part A — Setup and scaffolding
- Create a minimal web app (or reuse your existing app) that serves on port 8080.
- Add a Dockerfile that builds a small image serving the app.
- Create Kubernetes manifests:
  - k8s/deployment.yaml (a 3-replica Deployment)
  - k8s/service.yaml (ClusterIP service exposing port 80)
- Ensure the Deployment uses an image tag that CI will override (e.g., ghcr.io/OWNER/REPO:${TAG}).

Part B — GitHub Actions (CI path)
- Create .github/workflows/ci-cd.yaml with:
  - Build step that builds the Docker image and pushes to ghcr.io with two tags: latest and sha.
  - A kubeconfig secret in GitHub Secrets (KUBECONFIG) for cluster access.
  - A deployment step that applies k8s manifests and updates the image using kubectl set image, followed by rollout status.
- Verify locally by pushing to main and confirming that the cluster updates and rolls out.

Part C — GitLab CI (CI path)
- Create .gitlab-ci.yml with:
  - build stage that builds and pushes the Docker image to GitLab Container Registry with a stable tag.
  - deploy stage that uses a kubeconfig secret (KUBECONFIG) from CI/CD variables to apply manifests and update the image with kubectl set image, then check rollout status.
- Verify by pushing a commit and confirming the deployment updates in the cluster.

Part D — Observability and rollback
- Add a health check to the Kubernetes Deployment (readinessProbe).
- Implement a basic rollback check in CI (if rollout status times out, revert to the previous image tag).
- Add a simple canary pattern: deploy a canary Deployment with a small replica count and gradually shift traffic using a service or a canary controller (e.g., Argo Rollouts) if available in your environment.

Starter file hints
- Dockerfile (example):
  - FROM node:20-alpine
  - WORKDIR /app
  - COPY package*.json ./
  - RUN npm ci
  - COPY . .
  - EXPOSE 8080
  - CMD ["node", "server.js"]

- k8s/deployment.yaml (template; your image will be replaced by CI):
  - image: ghcr.io/OWNER/REPO:${TAG}
  - replicas: 3
  - readinessProbe: as shown above

- k8s/service.yaml:
  - ClusterIP service exposing port 80 to the app on port 8080

Deliverables
- A working GitHub Actions workflow or GitLab CI pipeline that builds, pushes, and deploys to a Kubernetes cluster.
- Kubernetes manifests that are clean, versioned, and can be applied idempotently with kubectl apply.
- Basic security considerations documented inline (secrets handling, least privilege, image tagging strategy).
- A short README or comments in YAML explaining how to customize for your cluster (namespace, registry, image repo, etc.).

If you’d like, I can tailor the exact workflow and manifests to a specific registry (Docker Hub, GHCR, GitLab Container Registry), cluster context (EKS/AKS/GKE/self-hosted), and namespace.