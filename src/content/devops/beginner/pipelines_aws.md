# Phase 2 — Containers & CI/CD: GitHub Actions & GitLab CI Pipelines (AWS)

This lesson dives into building and deploying containerized applications on AWS using two popular CI/CD ecosystems: GitHub Actions and GitLab CI. You’ll learn how to containerize applications, build images, push them to AWS Elastic Container Registry (ECR), and deploy updates to AWS ECS (Fargate) or similar services. You’ll also explore best practices for secrets management, image tagging, deployment strategies, and production readiness.

## 1. GitHub Actions Fundamentals for AWS

- Understand how GitHub Actions workflows automate building, testing, and deploying containerized apps to AWS.
- Learn typical AWS-oriented actions (ECR login, configuring credentials, and deploying to ECS).
- See a minimal, secure workflow skeleton you can adapt for many AWS projects.

### Code: Minimal GitHub Actions workflow to prepare AWS deployment

```yaml
name: CI/CD to AWS (ECR + ECS)

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

permissions:
  contents: read
  id-token: write  # required if using OIDC to assume AWS roles (recommended)

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v3
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GithubActionsRole
          aws-region: us-east-1

      - name: Log in to Amazon ECR
        uses: aws-actions/amazon-ecr-login@v3

      - name: Build and push Docker image
        env:
          IMAGE_REPO: my-app
          IMAGE_TAG: ${{ github.sha }}
          AWS_ACCOUNT_ID: 123456789012
          AWS_REGION: us-east-1
        run: |
          REPOSITORY_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE_REPO"
          docker buildx build --platform linux/amd64,linux/arm64 \
            -t "$REPOSITORY_URI:$IMAGE_TAG" --push .
          echo "IMAGE_TAG=$IMAGE_TAG" >> $GITHUB_OUTPUT
          echo "REPOSITORY_URI=$REPOSITORY_URI" >> $GITHUB_OUTPUT

      - name: Deploy to ECS (update task definition & service)
        env:
          AWS_REGION: us-east-1
          CLUSTER: my-ecs-cluster
          SERVICE: my-ecs-service
        run: |
          set -euo pipefail
          IMAGE_TAG="${{ steps.build.outputs.IMAGE_TAG }}"
          REPOSITORY_URI="${{ steps.build.outputs.REPOSITORY_URI }}"
          # Prepare a new task definition by substituting the image with the new tag
          sed -e 's|IMAGE|'"$REPOSITORY_URI:$IMAGE_TAG"'|' ecs/task-definition.json > ecs/new-task-definition.json
          NEW_ARN=$(aws ecs register-task-definition \
            --cli-input-json file://ecs/new-task-definition.json \
            --query 'taskDefinition.taskDefinitionArn' \
            --output text)
          aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" \
            --task-definition "$NEW_ARN" --region "$AWS_REGION"
```

### Line-by-line explanation

- name: CI/CD to AWS (ECR + ECS)
  - Declares the workflow name.

- on: push (main) / pull_request (main)
  - Triggers workflow on pushes to main and PRs targeting main.

- permissions
  - id-token for OIDC-based role assumption; contents for repo access.

- jobs/build-deploy
  - Defines a single job that runs on Ubuntu.

- Checkout code
  - Retrieves the repository contents for the workflow.

- Configure AWS credentials (OIDC)
  - Uses AWS OIDC to assume a role in AWS instead of long-lived keys.

- Log in to Amazon ECR
  - Authenticates Docker to push/pull images from AWS ECR.

- Build and push Docker image
  - Builds a multi-arch image, tags it with the commit SHA, and pushes to ECR.
  - Exposes IMAGE_TAG and REPOSITORY_URI to the next step via GITHUB_OUTPUT.

- Deploy to ECS
  - Creates a new ECS task definition using a template, substitutes in the new image, registers it, and updates the service to deploy the new task definition.

### Line-by-line explanation (alternative notes)
- This workflow uses a template task-definition.json with a placeholder IMAGE that gets replaced by the actual image URI:TAG to create a new task definition version, then updates the ECS service to trigger a deployment with the new image.

## 2. GitHub Actions: End-to-End Workflow (Build, Push to ECR, Deploy to ECS)

- Expand on the fundamentals by showing a more realistic end-to-end example, including error handling, caching, and tagging strategies.
- Emphasize immutable tagging (e.g., using commit SHA) and a rollback path.

### Code: Expanded GitHub Actions workflow with tagging and rollback hint

```yaml
name: CI/CD to AWS (ECR + ECS) - robust

on:
  push:
    branches:
      - main

permissions:
  contents: read
  id-token: write

jobs:
  build-alias-artefacts:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v3
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GithubActionsRole
          aws-region: us-east-1

      - name: Prepare image tag
        id: tag
        run: echo "IMAGE_TAG=${GITHUB_SHA}" >> $GITHUB_OUTPUT

      - name: Build and push image (multi-arch)
        env:
          IMAGE_REPO: my-app
          AWS_ACCOUNT_ID: 123456789012
          AWS_REGION: us-east-1
        run: |
          REPOSITORY_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE_REPO"
          docker buildx create --use --name multi-arch-builder || true
          docker buildx build --platform linux/amd64,linux/arm64 \
            -t "$REPOSITORY_URI:${{ steps.tag.outputs.IMAGE_TAG }}" \
            --push .
          echo "IMAGE_URI=$REPOSITORY_URI" >> $GITHUB_OUTPUT
          echo "IMAGE_TAG=${{ steps.tag.outputs.IMAGE_TAG }}" >> $GITHUB_OUTPUT

      - name: Deploy to ECS
        env:
          AWS_REGION: us-east-1
          CLUSTER: my-ecs-cluster
          SERVICE: my-ecs-service
        run: |
          set -euo pipefail
          IMAGE_URI="${{ steps.build.outputs.IMAGE_URI }}"
          IMAGE_TAG="${{ steps.tag.outputs.IMAGE_TAG }}"
          sed -e 's|IMAGE|'"$IMAGE_URI:$IMAGE_TAG"'|' ecs/task-definition.json > ecs/new-task-definition.json
          NEW_ARN=$(aws ecs register-task-definition \
            --cli-input-json file://ecs/new-task-definition.json \
            --query 'taskDefinition.taskDefinitionArn' \
            --output text)
          aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" \
            --task-definition "$NEW_ARN" --region "$AWS_REGION"
```

### Line-by-line explanation

- The workflow computes IMAGE_TAG as the commit SHA to ensure immutable image tags per release.
- It uses a similar replacement strategy to inject the new image into a task definition, then registers a new definition and updates the ECS service.
- Multi-arch builds with Buildx enable broader compatibility across platforms.

## 3. GitLab CI Fundamentals for AWS

- Understand the GitLab CI/CD pipeline syntax and how to leverage runners to build and push container images to AWS ECR.
- Learn how to securely pass AWS credentials to the pipeline (CI/CD variables, protected variables, and optional OIDC).
- See a basic GitLab CI pipeline that builds an image and triggers an ECS deployment.

### Code: Basic GitLab CI pipeline (build + push to ECR)

```yaml
stages:
  - build
  - deploy

variables:
  IMAGE_REPO: my-app
  AWS_REGION: us-east-1

before_script:
  - apk add --no-cache curl jq python3 py3-pip
  - pip3 install --no-cache-dir awscli
  - apk add --no-cache docker-cli

build:
  stage: build
  image: docker:24.0.6-dind
  services:
    - name: docker:dind
  script:
    - aws --version
    - $(aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin 123456789012.dkr.ecr.$AWS_REGION.amazonaws.com)
    - IMAGE_TAG=${CI_COMMIT_SHA}
    - REPOSITORY_URI=123456789012.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE_REPO
    - docker buildx create --use --name multi-arch-builder || true
    - docker buildx build --platform linux/amd64,linux/arm64 -t "$REPOSITORY_URI:$IMAGE_TAG" --push .
    - echo "IMAGE_URI=$REPOSITORY_URI" > image-info.txt
    - echo "IMAGE_TAG=$IMAGE_TAG" >> image-info.txt
  artifacts:
    paths:
      - image-info.txt
    expire_in: 1 day

deploy:
  stage: deploy
  image: amazon/aws-cli
  dependencies:
    - build
  script:
    - source image-info.txt
    - |
      cat > ecs-task-def.json <<JSON
      {
        "family": "my-app",
        "containerDefinitions": [
          {
            "name": "web",
            "image": "$IMAGE_URI:$IMAGE_TAG",
            "essential": true,
            "portMappings": [
              { "containerPort": 80, "hostPort": 80 }
            ]
          }
        ]
      }
      JSON
    - NEW_ARN=$(aws ecs register-task-definition --cli-input-json file://ecs-task-def.json --query 'taskDefinition.taskDefinitionArn' --output text)
    - aws ecs update-service --cluster my-ecs-cluster --service my-ecs-service --task-definition "$NEW_ARN" --region "$AWS_REGION"
```

### Line-by-line explanation

- stages define the order: build first, then deploy.
- The build job uses docker:dind to enable Docker in Docker for building/pushing images.
- Logs into ECR, builds a multi-arch image, tags with CI_COMMIT_SHA, and pushes to ECR.
- Artifacts persist the image-info for the deploy job to consume.
- The deploy job reads the image info, creates a task definition JSON with the new image, registers it, and updates the ECS service to rollout the new task definition.

## 4. GitLab CI: End-to-End Pipeline (Build, Push to ECR, Deploy to ECS)

- A complete end-to-end flow similar to the GitHub Actions example, adapted for GitLab's runners and CI/CD syntax.
- Demonstrates the same concepts: secure credentials, image tagging, task-definition replacement, and ECS deployment.

### Code: End-to-end GitLab CI with explicit environment variables

```yaml
stages:
  - build
  - deploy

variables:
  IMAGE_REPO: my-app
  AWS_REGION: us-east-1

build:
  stage: build
  image: docker:24.0.6-dind
  services:
    - name: docker:dind
  script:
    - apk add --no-cache curl jq
    - apk add --no-cache docker-cli
    - aws --version
    - aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin 123456789012.dkr.ecr.$AWS_REGION.amazonaws.com
    - IMAGE_TAG=${CI_COMMIT_SHA}
    - REPOSITORY_URI=123456789012.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE_REPO
    - docker buildx create --use --name multi-arch-builder || true
    - docker buildx build --platform linux/amd64,linux/arm64 -t "$REPOSITORY_URI:$IMAGE_TAG" --push .
    - echo "IMAGE_URI=$REPOSITORY_URI" > image-info.txt
    - echo "IMAGE_TAG=$IMAGE_TAG" >> image-info.txt
  artifacts:
    paths:
      - image-info.txt
    expire_in: 1 day

deploy:
  stage: deploy
  image: amazon/aws-cli
  dependencies:
    - build
  script:
    - source image-info.txt
    - >
      cat > ecs-task-def.json <<JSON
      {
        "family": "my-app",
        "containerDefinitions": [
          {
            "name": "web",
            "image": "$IMAGE_URI:$IMAGE_TAG",
            "essential": true,
            "portMappings": [{ "containerPort": 80, "hostPort": 80 }]
          }
        ]
      }
      JSON
    - NEW_ARN=$(aws ecs register-task-definition --cli-input-json file://ecs-task-def.json --query 'taskDefinition.taskDefinitionArn' --output text)
    - aws ecs update-service --cluster my-ecs-cluster --service my-ecs-service --task-definition "$NEW_ARN" --region "$AWS_REGION"
```

### Line-by-line explanation

- The pipeline builds a multi-arch image and pushes it to ECR, saving the URI and tag for downstream steps.
- The deploy step registers a new ECS task definition that uses the newly built image and updates the service to deploy it.
- GitLab’s artifacts mechanism passes the image info between stages.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Exposing long-lived AWS credentials in pipelines
  - Bad (text in workflow secrets or config):
```yaml
# Bad: Secrets stored in plain vars or checked into repo
env:
  AWS_ACCESS_KEY_ID: YOUR_ACCESS_KEY
  AWS_SECRET_ACCESS_KEY: YOUR_SECRET
```
  - Good:
```yaml
# Good: Use OIDC or protected secrets; avoid hard-coding creds
# GitHub Actions: rely on OIDC with role-to-assume (no static keys)
# GitLab CI: use CI_JOB_TOKEN or protected variables with short-lived tokens
```

- Pitfall 2: Using a mutable tag like "latest" for production deployments
  - Bad:
```yaml
# Bad: always tag as latest
IMAGE_TAG: latest
```
  - Good:
```yaml
# Good: immutable tag per commit or per release
IMAGE_TAG: $GITHUB_SHA
# or: IMAGE_TAG: v${RELEASE_VERSION}
```

- Pitfall 3: Not pinning the ECS task definition to a specific ARN or failing to update properly
  - Bad:
```yaml
# Bad: reusing an old task definition without updating image
aws ecs update-service --cluster $CLUSTER --service $SERVICE --force-new-deployment
```
  - Good:
```yaml
# Good: register a new task definition with the updated image and use its ARN
NEW_ARN=$(aws ecs register-task-definition --cli-input-json file://ecs/new-task-definition.json \
  --query 'taskDefinition.taskDefinitionArn' --output text)
aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" --task-definition "$NEW_ARN"
```

- Pitfall 4 (bonus): Skipping tests or health checks before deployment
  - Bad: deploying without smoke tests
  - Good: include a quick container health check or integration test in the pipeline before deployment

## Y. Why This Matters In Real Systems — production context and real usage

- Consistency and repeatability: Immutable image tags (e.g., commit SHAs) ensure you can trace exactly what ran in production.
- Rollbackability: By registering new task definitions per deployment, you can roll back by pointing the service to a previous ARN.
- Security: Prefer OIDC-based credential management and minimal IAM permissions (least privilege) for the GitHub/GitLab runners.
- Observability: Integrate deployment status with monitoring (CloudWatch alarms, ECS deployment events) and add dashboards to observe rollout progress and error rates.
- Compliance and audit: Tagging, artifact provenance, and versioned task definitions help with audits and incident investigations.
- Cost and reliability: ECS Fargate abstracts server management while still allowing you to scale containers, pause/on-demand, and optimize resource requests.

## Z. Study Questions — 5 recall questions

1. What is the purpose of ECR in the CI/CD workflow, and why is image tagging important?
2. How does AWS ECS deploy a new version of a container when using GitHub Actions or GitLab CI?
3. What is the advantage of using OIDC over long-lived AWS credentials in CI/CD pipelines?
4. Describe the difference between a task definition ARN and a task definition JSON in ECS deployment.
5. List two common security best practices when wiring CI/CD pipelines to AWS resources.

## Exercise — a practical multi-part coding challenge

Part A: Set up a GitHub Actions workflow to build a container image, push to ECR, register a new ECS task definition, and deploy to ECS.

- Deliverables:
  - A GitHub Actions workflow file in .github/workflows/ci-cd-aws.yml.
  - An ECS task definition template with a placeholder for the image, and a script to substitute the new image tag.

Part B: Create a GitLab CI pipeline that implements the same flow to AWS.

- Deliverables:
  - A .gitlab-ci.yml that builds, pushes to ECR, and updates ECS with a new task definition ARN.

Part C: Security and reliability improvements

- Tasks:
  - Replace static credentials with OIDC or protected variables.
  - Implement an immutable image tagging strategy (e.g., CI_COMMIT_SHA).
  - Add a smoke test step to verify the container starts properly after deployment (e.g., curl health endpoint or ECS describe-services to confirm deployment).

Part D: Optional extension — blue/green deployment pattern

- Challenge:
  - Extend the workflow/pipeline to implement a blue/green deployment by creating two ECS services (blue and green) and switching traffic with a ALB listener rule or target group swap.

Notes and guidance

- Use us-east-1 (or your region) consistently across all resources (ECR, ECS).
- Store sensitive values (ARNs, region, account IDs) as secrets/variables in GitHub or GitLab and reference them in workflows/pipelines.
- Keep the ECS task-definition.json or templates under version control, with a dedicated template for replacement at deployment time.
- Consider adding a rollback path by keeping the previous task definition ARN accessible to the deploy step.

If you’d like, I can tailor the examples to your exact AWS setup (ECS cluster names, service names, VPC networking, or whether you’re using Fargate, EC2, or EKS) and provide a ready-to-copy repository skeleton.