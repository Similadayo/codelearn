# GitHub Actions & GitLab CI Pipelines in Azure: Phase 2 — Containers & CI/CD

DevOps and Cloud Engineering increasingly rely on repeatable, automated pipelines to build, test, and deploy containerized applications. In Azure-centric ecosystems, GitHub Actions and GitLab CI offer first-class integrations to container registries (ACR), orchestrators (AKS), and cloud authentication flows. This lesson teaches you how to design, implement, and secure end-to-end pipelines for containerized apps using GitHub Actions and GitLab CI, with practical Azure-focused examples.

## 1. GitHub Actions: Azure-focused CI/CD Pipeline — Build, Push, and Deploy to AKS

This section provides a concrete GitHub Actions workflow that logs into Azure, builds a Docker image, pushes it to Azure Container Registry (ACR), and updates an AKS deployment to roll out the new image. The workflow demonstrates best practices like using Buildx for multi-arch builds, and using Azure credentials stored as GitHub Secrets.

```yaml
name: CD: Build, Push to ACR, Deploy to AKS (Azure)

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

permissions:
  contents: read
  packages: write

jobs:
  build-push-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Log in to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Log in to Azure Container Registry
        run: |
          az acr login --name ${{ secrets.ACR_NAME }}

      - name: Set up QEMU and Docker Buildx
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v1

      - name: Build and push multi-arch image
        run: |
          IMAGE_TAG=${{ github.sha }}
          REGISTRY=${{ secrets.ACR_NAME }}.azurecr.io
          docker buildx build --platform linux/amd64,linux/arm64 -t $REGISTRY/myapp:$IMAGE_TAG --push .

      - name: Deploy to AKS
        env:
          REGISTRY: ${{ secrets.ACR_NAME }}.azurecr.io
          IMAGE_TAG: ${{ github.sha }}
        run: |
          az aks get-credentials --resource-group ${{ secrets.AZURE_RESOURCE_GROUP }} --name ${{ secrets.AZURE_AKS_CLUSTER }}
          kubectl upgrade 2>/dev/null || true
          kubectl set image deployment/myapp-deployment myapp=$REGISTRY/myapp:$IMAGE_TAG
```

### Line-by-line explanation
- name: CD: Build, Push to ACR, Deploy to AKS (Azure)
  - Declares the workflow name shown in the GitHub Actions UI.
- on: push branches: [main], pull_request branches: [main]
  - Triggers when code is pushed to main or when a PR targets main.
- permissions: contents: read, packages: write
  - Grants necessary permissions for checkout and pushing container images.
- jobs: build-push-deploy
  - Defines a single job that runs sequential steps.
- runs-on: ubuntu-latest
  - Uses a hosted Linux runner.
- Checkout code
  - Checks out the repository so subsequent steps can access the code and Dockerfile.
- Log in to Azure (azure/login@v1)
  - Authenticates to Azure using a service principal JSON stored in secrets.AZURE_CREDENTIALS.
- Log in to Azure Container Registry
  - Runs az acr login to authenticate to the specified ACR.
- Set up QEMU and Docker Buildx
  - Enables multi-architecture builds (amd64 and arm64) via QEMU emulation.
- Set up Docker Buildx
  - Installs and configures Docker Buildx for advanced builds and pushing multi-arch images.
- Build and push multi-arch image
  - Builds and pushes the Docker image tagged with the commit SHA to ACR. Uses Buildx for multi-arch support.
- Deploy to AKS
  - Retrieves AKS credentials and updates the Kubernetes deployment image to the newly built one.
- ENV and IMAGE_TAG
  - IMAGE_TAG uses the GitHub SHA; REGISTRY references the ACR endpoint derived from secrets.

Notes:
- Secrets you need: AZURE_CREDENTIALS (service principal JSON), ACR_NAME, AZURE_RESOURCE_GROUP, AZURE_AKS_CLUSTER.
- This workflow focuses on end-to-end automation: build, push, and deploy in a single flow.
- For real-world environments, you may want to separate concerns (e.g., separate build, push, and deploy jobs) and implement rollout strategies (canary, blue/green).

## 2. GitLab CI: Azure-focused Pipeline — Build, Push, and Deploy to AKS

This section demonstrates a GitLab CI pipeline that builds a Docker image, pushes it to Azure Container Registry (ACR), and updates an AKS deployment. It uses a Docker-in-Docker setup for building images and the Azure CLI for AKS interactions.

```yaml
stages:
  - build
  - deploy

variables:
  REGISTRY: $AZURE_ACR_NAME.azurecr.io
  IMAGE_NAME: $CI_PROJECT_NAME

image: docker:24

services:
  - name: docker:dind

before_script:
  - apk add --no-cache curl bash jq
  - curl -sL https://aka.ms/InstallAzureCLIDeb | bash
  - az login --service-principal -u "$AZURE_CLIENT_ID" -p "$AZURE_CLIENT_SECRET" --tenant "$AZURE_TENANT_ID"
  - az acr login --name "$AZURE_ACR_NAME"
  - docker info
  - docker version
  - echo "Preparing to build image: $REGISTRY/$IMAGE_NAME:$CI_COMMIT_SHORT_SHA"

build:
  stage: build
  script:
    - IMAGE_TAG=$CI_COMMIT_SHORT_SHA
    - docker build -t $REGISTRY/$IMAGE_NAME:$IMAGE_TAG .
    - docker push $REGISTRY/$IMAGE_NAME:$IMAGE_TAG

deploy:
  stage: deploy
  image: mcr.microsoft.com/azure-cli:2.43.0
  script:
    - az login --service-principal -u "$AZURE_CLIENT_ID" -p "$AZURE_CLIENT_SECRET" --tenant "$AZURE_TENANT_ID"
    - az aks get-credentials --resource-group "$AZURE_RESOURCE_GROUP" --name "$AZURE_AKS_CLUSTER"
    - IMAGE_TAG=$CI_COMMIT_SHORT_SHA
    - REGISTRY=$REGISTRY
    - kubectl set image deployment/$CI_PROJECT_NAME-deployment $CI_PROJECT_NAME=$REGISTRY/$IMAGE_NAME:$IMAGE_TAG
```

### Line-by-line explanation
- stages: build, deploy
  - Defines the two phases of the pipeline: build the image, then deploy to AKS.
- variables: REGISTRY, IMAGE_NAME
  - Sets common variables for reuse in both jobs; REGISTRY points to the ACR and IMAGE_NAME to the project name.
- image: docker:24
  - Uses a Docker-in-Docker friendly image for the build job to access the Docker daemon.
- services: docker:dind
  - Enables Docker-in-Docker so the build job can run docker build and push.
- before_script
  - Installs Azure CLI, logs into Azure with a service principal, logs into ACR, and prints docker info for debugging.
- build job
  - Builds and pushes the image to ACR using the short Git commit SHA as the tag.
- deploy job
  - Uses an Azure CLI image to login, fetch AKS credentials, and update the Kubernetes deployment image to the newly built one.

Notes:
- Secrets you need: AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID, AZURE_ACR_NAME, AZURE_RESOURCE_GROUP, AZURE_AKS_CLUSTER.
- The pipeline uses a multi-stage approach to keep build and deployment concerns separated and predictable.

## 3. Azure Prerequisites and Practical Considerations for CI/CD with Containers

A solid deployment pipeline in Azure commonly relies on:
- Azure Container Registry (ACR) as the private image store.
- Azure Kubernetes Service (AKS) or Azure App Service for hosting containers.
- Service principals and managed identity for secure, auditable access.
- Secrets management via GitHub Secrets or GitLab CI variables.
- Optional: canary, blue/green, or progressive delivery strategies for safer rollouts.
- Caching and rebuilding strategies to optimize pipeline times.
- Observability hooks: tracing, logging, metrics for deployments and canary traffic.

Example Azure CLI snippets you might run in your pipelines for provisioning (one-time setup):
```
# Create an AKS cluster (single-node for demo)
az aks create --resource-group my-rg --name my-aks --node-count 1 --enable-addons monitoring --generate-ssh-keys

# Create an ACR and push a sample image
az acr create --resource-group my-rg --name myacrname --sku Basic
```

### Line-by-line explanation
- az aks create ...
  - Provisions an AKS cluster in the specified resource group with monitoring enabled and SSH keys generated for cluster access.
- az acr create ...
  - Creates a private container registry to store container images used by the cluster.

Notes:
- In real projects, you would parameterize these commands and store resource names in CI/CD secrets or a separate IaC (Infrastructure as Code) pipeline (Terraform or ARM templates).

## 4. X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code

- Pitfall 1: Storing credentials in the pipeline or in code
  - Bad:
    ```yaml
    # GitHub Actions (bad)
    env:
      AZURE_PASSWORD: "supersecret"
    ```
  - Good:
    ```yaml
    # GitHub Actions (good)
    # Use GitHub Secrets: AZURE_CREDENTIALS json and reference via ${{ secrets.AZURE_CREDENTIALS }}
    ```
- Pitfall 2: Using image tags like latest or unpinned versions
  - Bad:
    ```
    docker pull node:latest
    ```
  - Good:
    ```
    docker pull node:18-alpine
    ```
- Pitfall 3: Not logging into ACR before build
  - Bad:
    ```
    - docker build -t $REGISTRY/myapp:$IMAGE_TAG .
    - docker push $REGISTRY/myapp:$IMAGE_TAG
    ```
  - Good:
    ```
    - az acr login --name ${{ secrets.ACR_NAME }}
    - docker build -t $REGISTRY/myapp:$IMAGE_TAG .
    - docker push $REGISTRY/myapp:$IMAGE_TAG
    ```
- Pitfall 4: Not using a proper deployment strategy (no rollback)
  - Bad: Directly updating the image without canary/rollback logic.
  - Good: Implement a canary or blue/green deployment pattern and include a rollback path if the health checks fail.

Explanation notes:
- Secrets management is essential for security; never hard-code credentials in pipeline files.
- Pinning image versions in CI reduces drift and makes builds deterministic.
- Always ensure the deployment can be rolled back if the new version fails health checks.

## 5. Y. Why This Matters In Real Systems — production context and real usage

- Consistency and reproducibility: IaC and CI/CD ensure builds, tests, and deployments are repeatable across environments (dev, staging, prod).
- Faster time-to-market: Automated pipelines reduce manual toil, enabling teams to ship features quickly with confidence.
- Security and compliance: Centralized secrets management, access controls, and audit trails (who deployed what and when) improve security posture.
- Reliability and rollback: Canary or blue/green deployments reduce blast radius; automated health checks enable quick rollbacks.
- Observability: Integrating logs, metrics, and distributed tracing with deployment workflows provides visibility into failures and performance issues.
- Cost and scale considerations: Proper caching, buildx multi-arch, and selective triggers help manage CI costs as teams scale.

Real-world usage patterns:
- Separate build and deploy stages to parallelize work and reduce overall cycle time.
- Use environment-specific branches or tags to promote artifacts (e.g., main → staging → production).
- Store deployment health criteria as part of the deployment step (e.g., readiness probes, canary metrics).

## 6. Z. Study Questions — 5 recall questions

1) What is the main difference between GitHub Actions and GitLab CI in how you configure workflows/pipelines?  
2) Why is it important to login to ACR before building and pushing images in a CI/CD pipeline?  
3) Name two Azure services commonly used in container-based CI/CD pipelines and their roles.  
4) What are some secure ways to manage credentials in GitHub Actions or GitLab CI?  
5) Describe a basic canary deployment concept and why it is beneficial in production.

## 7. Exercise — practical multi-part coding challenge

Goal: Implement a small, end-to-end container deployment pipeline for an Azure-hosted app using both GitHub Actions and GitLab CI. You will simulate a minimal repository and provide concrete steps to finish.

Part A: Prepare the repository (conceptual)
- Create a simple app (for example, a minimal Node.js or Python app) with a Dockerfile that serves a basic HTTP endpoint.
- Ensure the repository includes a Dockerfile at the root.

Part B: GitHub Actions workflow (complete the example)
- Create a GitHub workflow (.github/workflows/ci-cd-azure.yml) that:
  - Checks out code, logs into Azure with a service principal stored in AZURE_CREDENTIALS, logs into ACR, builds a multi-arch image, pushes to ACR, and updates an AKS deployment.
  - Add necessary secrets: AZURE_CREDENTIALS, ACR_NAME, AZURE_RESOURCE_GROUP, AZURE_AKS_CLUSTER.
- Validate that the workflow tags the image with the commit SHA and updates the deployment image accordingly.
- Optional: Add a separate job for basic tests (e.g., curl a service endpoint after deployment).

Part C: GitLab CI pipeline (complete the example)
- Create a GitLab CI file (.gitlab-ci.yml) that mirrors the GitHub workflow’s capabilities:
  - Build and push to ACR from a docker-in-docker setup.
  - Deploy to AKS using the Azure CLI image.
  - Inject necessary CI/CD variables: AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID, AZURE_ACR_NAME, AZURE_RESOURCE_GROUP, AZURE_AKS_CLUSTER.
- Ensure the deploy step updates the deployment image with the correct tag (CI_COMMIT_SHORT_SHA).

Part D: Secrets and basic security review
- Review how credentials are stored in both systems:
  - GitHub Secrets vs GitLab CI variables.
- Explain how to rotate service principal credentials and how to revoke access if a secret is leaked.
- Add a brief note about least-privilege service principals (RP role assignments) and how it affects your pipelines.

Part E: Optional extension (observability)
- Add a small health check step in the canary deployment that validates the app responds on a path and fails the deployment if the health check fails.
- Configure a simple rollback path in case the health check does not pass after a set number of minutes.

You should now have a practical, Azure-focused lesson on GitHub Actions and GitLab CI pipelines for containers and CI/CD. The examples illustrate core patterns for building, pushing, and deploying containerized apps to AKS (Azure Kubernetes Service) and show how to manage credentials securely within modern CI systems.