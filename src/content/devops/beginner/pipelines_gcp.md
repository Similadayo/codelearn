# GitHub Actions & GitLab CI Pipelines in Google Cloud

This lesson covers how to implement modern CI/CD pipelines for Google Cloud environments using two popular CI systems: GitHub Actions and GitLab CI. You’ll learn to build container images, push them to Google Artifact Registry, and deploy to Cloud Run or GKE. You’ll also cover authentication, secret management, and best practices for secure, maintainable pipelines in production.

## 1. GitHub Actions for Google Cloud: Build, Push, Deploy to Cloud Run (Artifact Registry)

This section shows a concrete GitHub Actions workflow that:
- authenticates to Google Cloud using a service account
- builds a Docker image
- pushes it to Artifact Registry
- deploys to Cloud Run (managed)

Code: .github/workflows/gcloud-cloudrun.yml
```yaml
name: CI/CD to Google Cloud Run

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

permissions:
  contents: read

env:
  REGION: us-central1
  REPO: my-repo
  SERVICE: my-cloud-run-service
  IMAGE_TAG: latest

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Cloud SDK and authenticate
        uses: google-github-actions/setup-gcloud@v2
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          export_default_credentials: true

      - name: Ensure Artifact Registry repository exists
        id: ensure-art-reg
        run: |
          REGISTRY=${{ env.REGION }}-docker.pkg.dev
          if ! gcloud artifacts repositories describe ${{ env.REPO }} --location ${{ env.REGION }} >/dev/null 2>&1; then
            gcloud artifacts repositories create ${{ env.REPO }} --repository-format=docker --location ${{ env.REGION }}
          fi

      - name: Configure Docker to use Artifact Registry
        run: |
          gcloud auth configure-docker $REGISTRY

      - name: Build Docker image
        run: |
          IMAGE="$REGISTRY/${{ secrets.GCP_PROJECT_ID }}/${{ env.REPO }}/${{ env.SERVICE }}:${{ env.IMAGE_TAG }}"
          docker build -t "$IMAGE" .
          echo "IMAGE=$IMAGE" >> $GITHUB_OUTPUT

      - name: Push Docker image
        run: |
          IMAGE="${{ env.REGION }}-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/$${{ env.REPO }}/${{ env.SERVICE }}:${{ env.IMAGE_TAG }}"
          echo "PUSH_IMAGE=$IMAGE" >> $GITHUB_OUTPUT
          docker push "$IMAGE"

      - name: Deploy to Cloud Run (managed)
        env:
          IMAGE: ${{ steps.image.output.IMAGE }}
        run: |
          IMAGE="$REGION-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/$${{ env.REPO }}/${{ env.SERVICE }}:${{ env.IMAGE_TAG }}"
          gcloud run deploy ${{ env.SERVICE }} \
            --image "$IMAGE" \
            --region ${{ env.REGION }} \
            --platform managed \
            --allow-unauthenticated
```

### Line-by-line explanation

- name: CI/CD to Google Cloud Run
  - Declares the workflow name.

- on: push, pull_request
  - Triggers on pushes to main/master and PRs to those branches.

- permissions: contents: read
  - Grants read access to the repository for the workflow; needed for actions.

- env: region, repo, service, and image tag
  - Centralized environment variables used by steps.

- jobs.build-and-deploy: runs-on: ubuntu-latest
  - Defines a single job that runs on the latest Ubuntu runner.

- Checkout code
  - Checks out the repository so subsequent steps can access code and Dockerfile.

- Set up Cloud SDK and authenticate
  - Uses a GitHub Action to install the Google Cloud SDK and authenticate with a service account key stored in GitHub Secrets. Exports credentials as default.

- Ensure Artifact Registry repository exists
  - Checks if the Artifact Registry repository exists; if not, creates it. Uses the region as the location.

- Configure Docker to use Artifact Registry
  - Configures Docker to authenticate to Artifact Registry using gcloud.

- Build Docker image
  - Builds the Docker image using a Dockerfile in the repo and tags it with the Artifact Registry path. The IMAGE value is exposed to later steps via output.

- Push Docker image
  - Pushes the built image to Artifact Registry.

- Deploy to Cloud Run (managed)
  - Deploys the pushed image to Cloud Run in the specified region. Publishes the service publicly (unauthenticated) for simplicity; adjust for private services as needed.

Notes and variations:
- You can switch to Cloud Run with a private config, VPC egress, or use Cloud Run on GKE if needed.
- You can deploy to GKE instead by using kubectl in a separate step after building/pushing the image.

### Line-by-line explanation (deployment snippet)
- IMAGE variable construction uses region-specific Artifact Registry URL: REGION-docker.pkg.dev.
- gcloud run deploy uses the service name, region, and image to create/update a Cloud Run service.

## 2. GitLab CI/CD for Google Cloud: Build, Push, Deploy to Cloud Run (Artifact Registry)

This section shows a GitLab CI/CD pipeline that mirrors the GitHub example, but uses GitLab's syntax. It authenticates with a Google Cloud service account, builds and pushes a Docker image to Artifact Registry, then deploys to Cloud Run.

Code: .gitlab-ci.yml
```yaml
image: google/cloud-sdk:slim

variables:
  REGION: us-central1
  REPO: my-repo
  SERVICE: my-cloud-run-service
  IMAGE_TAG: latest
  REGISTRY: ${REGION}-docker.pkg.dev

stages:
  - build
  - deploy

before_script:
  - echo "$GCP_SA_KEY" > /tmp/key.json
  - gcloud auth activate-service-account --key-file /tmp/key.json
  - gcloud config set project "$GCP_PROJECT_ID"
  - gcloud auth configure-docker "${REGISTRY}"

build:
  stage: build
  script:
    - IMAGE="${REGISTRY}/${GCP_PROJECT_ID}/${REPO}/${SERVICE}:${IMAGE_TAG}"
    - docker build -t "$IMAGE" .
    - docker push "$IMAGE"
  only:
    - branches
    - tags

deploy:
  stage: deploy
  script:
    - IMAGE="${REGISTRY}/${GCP_PROJECT_ID}/${REPO}/${SERVICE}:${IMAGE_TAG}"
    - gcloud run deploy "${SERVICE}" \
        --image "$IMAGE" \
        --region "$REGION" \
        --platform managed \
        --allow-unauthenticated
  only:
    - main
    - master
```

### Line-by-line explanation

- image: google/cloud-sdk:slim
  - Uses Google Cloud SDK image with Docker pre-installed for CI steps.

- variables: REGION, REPO, SERVICE, IMAGE_TAG, REGISTRY
  - Centralize configuration; REGISTRY resolves to the Artifact Registry Docker host for the region.

- stages: build, deploy
  - Two-stage pipeline: first builds the image, then deploys it.

- before_script:
  - Writes the GA key from GitLab CI variable GCP_SA_KEY to a file, authenticates with gcloud, sets the project, and configures Docker to work with Artifact Registry.

- build job:
  - Builds a Docker image using the Dockerfile in the repo, tags it with the Artifact Registry path, and pushes to Artifact Registry.

- deploy job:
  - Deploys the pushed image to Cloud Run, using the same region and service name. Deploys as unauthenticated; adjust for private access if needed.

Notes and variations:
- You can parameterize the service account key, project ID, and service name via GitLab CI variables.
- For private Cloud Run endpoints, remove --allow-unauthenticated or set IAM policies accordingly.

## 3. Service Accounts, Secrets, and Environment Setup (Security and Access Patterns)

To securely automate CI/CD against Google Cloud, you typically create a dedicated service account with the minimum required roles, and you store its key securely in your CI system.

Code: creating a dedicated CI/CD service account and granting permissions
```bash
# Create a dedicated CI/CD service account
gcloud iam service-accounts create ci-cd-sa --display-name "CI/CD for GitHub/GitLab pipelines"

# Grant needed roles (adjust to your exact needs; prefer narrow scopes in production)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:ci-cd-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:ci-cd-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.admin"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:ci-cd-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"  # Optional: for artifacts in GCS, if used
```

Secret management notes:
- GitHub: store the service account JSON as a secret (e.g., GCP_SA_KEY). In the workflow, pass via service_account_key: ${{ secrets.GCP_SA_KEY }}.
- GitLab: store the JSON key content in a protected variable (e.g., GCP_SA_KEY) and reference it in before_script to write a file for gcloud auth.

Environment layout tips:
- Separate environments (dev/staging/prod) with separate projects or separate Artifact Registry repositories and Cloud Run services.
- Use distinct service accounts per environment with least privilege and explicit IAM bindings.
- Use image tagging with CI_SHAs or semantic versioning to support rollbacks.

### Line-by-line explanation (service account creation)
- gcloud iam service-accounts create ci-cd-sa
  - Creates a new service account for CI/CD.

- gcloud projects add-iam-policy-binding ... --role run.admin
  - Grants the service account permission to manage Cloud Run services.

- gcloud projects add-iam-policy-binding ... --role artifactregistry.admin
  - Grants permissions to manage Artifact Registry repositories and images.

- Additional roles (e.g., storage.admin) may be added as needed for other artifacts (buckets, logs, etc.).

## X. Common Beginner Mistakes

- Bad: Hard-coding credentials in workflow/pipeline files.
  - Bad:
    - name: Deploy
      run: gcloud auth activate-service-account --key-file="KEY.json" # KEY.json checked into repo or inline
  - Good:
    - Use secrets in GitHub/GitLab to store GCP_SA_KEY and reference them via secrets. Avoid inline JSON keys.

- Bad: Not pinning tool versions or actions
  - Bad:
    - uses: google-github-actions/setup-gcloud@v1  # unpinned version
  - Good:
    - uses: google-github-actions/setup-gcloud@v2
      with:
        project_id: ${{ secrets.GCP_PROJECT_ID }}
        service_account_key: ${{ secrets.GCP_SA_KEY }}
        export_default_credentials: true

- Bad: Granting overly broad permissions to the CI/CD service account
  - Bad:
    - roles/editor on the project
  - Good:
    - Follow least-privilege: roles/run.admin, roles/artifactregistry.admin, and specific resource-scoped roles as needed.

- Bad: Not handling image tagging or transient builds
  - Bad:
    - docker build -t my-image:latest .  # no unique tag
  - Good:
    - docker build -t "$REGISTRY/PROJECT/REPO/APP:$CI_COMMIT_SHORT_SHA" .
      docker push "$REGISTRY/PROJECT/REPO/APP:$CI_COMMIT_SHORT_SHA"

- Bad: Deploying every PR build to production
  - Bad:
    - Deploy on pull_request trigger
  - Good:
    - Restrict production deploys to main/master only and require a manual approval or canary deployment strategy for PRs.

## Y. Why This Matters In Real Systems

- Reproducibility: CI/CD pipelines ensure builds and deployments are repeatable. Tagged images and pinned toolchain prevent drift.
- Security: Secrets management, service accounts with scoped permissions, and audit trails reduce blast radius in case of compromise.
- Speed and feedback: Automated tests, build caching, and parallel jobs speed up release cycles, helping teams iterate quickly.
- Reliability and rollback: Artifact Registry lets you tag and store image versions; Cloud Run/GKE deployments can be rolled back by re-deploying a previous image.
- Compliance and traceability: Git-based workflows provide an auditable history of what was deployed, when, and by whom.

## Z. Study Questions

1. What are the main differences between Google Container Registry (GCR) and Google Artifact Registry (AR), and why would you choose AR in CI/CD workflows?
2. How do you securely provide a Google Cloud service account key to GitHub Actions or GitLab CI?
3. Why is image tagging important in CI/CD pipelines, and what tagging strategy would you recommend for production deployments?
4. Describe how to configure Cloud Run or GKE deployments to be private vs public. What changes would you make in the pipeline?
5. What is the purpose of the gcloud auth configure-docker step in these pipelines?

## Exercise

Part A — Prepare a minimal app and Dockerfile
- Create a small, vendor-free application (e.g., Node.js or Python) that serves a simple HTTP response.
- Add a Dockerfile to containerize the app.
- Example Node.js app:
  - server.js that responds with "Hello from Cloud Run"
  - package.json with express dependency
  - Dockerfile to build a Node.js app

Part B — GitHub Actions workflow (cloud run)
- Implement a GitHub Actions workflow (as in Section 1) to:
  - Build Docker image from your app
  - Push to Google Artifact Registry
  - Deploy to Cloud Run (region of choice)
- Use a dedicated CI service account with restricted permissions.

Part C — GitLab CI/CD pipeline (cloud run)
- Implement a GitLab CI/CD pipeline (as in Section 2) to build, push, and deploy to Cloud Run.
- Ensure the pipeline uses GCP_SA_KEY stored securely in GitLab CI/CD variables.

Part D — Verification and rollback
- Access the deployed Cloud Run service URL to verify it serves the correct response.
- Practice a rollback by redeploying with a previous image tag and confirm the URL serves the older response (if you changed the app accordingly).

Deliverables to submit:
- A minimal app repository containing: app code (server.js or main.py), a Dockerfile, and the two CI/CD configurations (.github/workflows/gcloud-cloudrun.yml and .gitlab-ci.yml).
- A short write-up explaining your secret management approach, the tagging strategy you used, and how you would promote changes from dev to prod with canary or blue/green deployments.

This lesson equips you with practical, production-aware patterns for CI/CD in Google Cloud using GitHub Actions and GitLab CI, aligning with DevOps and Cloud Engineering goals.