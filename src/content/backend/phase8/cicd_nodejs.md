# CI/CD with GitHub Actions Pipelines (Node.js)

Intro: Continuous Integration and Continuous Deployment (CI/CD) automate how code changes are built, tested, and released. GitHub Actions provides native, scalable workflows that integrate directly with your GitHub repository. For Node.js backends, well-designed workflows ensure consistent environments, fast feedback, and reliable deployments to staging or production—crucial for performance, security, and customer trust in real systems.

## 1. Basic CI: Node.js with Matrix, Cache, Lint, and Tests
This section introduces a foundational CI workflow that runs on push and pull requests to main, tests across multiple Node.js versions, caches dependencies, and runs linting.

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [ '14.x', '16.x', '18.x' ]

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Cache npm
        uses: actions/cache@v3
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-

      - name: Install dependencies
        run: npm ci

      - name: Lint (if present)
        run: npm run lint --if-present

      - name: Run tests
        run: npm test
```

### Line-by-line explanation
- name: CI
  - Names the workflow for display in the Actions tab.
- on: push/pull_request to main
  - Triggers the workflow on pushes and PRs targeting the main branch.
- permissions: contents: read
  - Grants read access to the repository contents for the job.
- jobs/test
  - Defines a job named test.
- runs-on: ubuntu-latest
  - Runs the job on the latest Ubuntu runner.
- strategy.matrix.node-version
  - Runs the job for each Node.js version in the matrix (14.x, 16.x, 18.x).
- steps/Checkout code
  - Checks out the repository so the workflow can access code.
- steps/Set up Node.js
  - Uses the official setup-node action to install the specified Node.js version.
- steps/Cache npm
  - Caches the npm cache to speed up subsequent installs; key invalidates when package-lock.json changes.
- steps/Install dependencies
  - Runs npm ci to install dependencies deterministically from package-lock.json.
- steps/Lint (if present)
  - Runs lint if a lint script exists in package.json.
- steps/Run tests
  - Executes the test script defined in package.json.

---

## 2. Build, Coverage, and Artifacts: Enhancing Quality Gates
We extend the basic CI to collect coverage data, publish a coverage artifact, and ensure a single, reproducible build artifact is available for further steps (like deployment).

```yaml
name: CI + Coverage

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [ '18.x' ]

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Cache npm
        uses: actions/cache@v3
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}

      - name: Install dependencies
        run: npm ci

      - name: Lint (if present)
        run: npm run lint --if-present

      - name: Run tests with coverage
        run: npm test -- --coverage

      - name: Upload coverage to Codecov (optional)
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true
```

### Line-by-line explanation
- name: CI + Coverage
  - Presents a combined CI workflow name for display.
- on: push/pull_request to main
  - Triggers for pushes and PRs to main (same as basic CI).
- jobs/build
  - Defines a single build job with a fixed Node.js version (18.x) for a stable baseline.
- steps/Cache npm
  - Caches npm to speed up installs; depends on package-lock.json hash.
- steps/Install dependencies
  - Installs dependencies via npm ci.
- steps/Run tests with coverage
  - Runs tests and collects coverage data (configured by the test runner, e.g., Jest).
- steps/Upload coverage to Codecov
  - Uploads coverage data to Codecov; can be swapped for Code Climate, Coveralls, or artifact storage.
  
Notes:
- Ensure your test runner produces a coverage report at coverage/lcov.info (common with Jest).
- If you don’t use Codecov, you can instead upload artifacts or publish a local artifact.

---

## 3. Deploying to AWS S3 + CloudFront: Production Readiness
This example shows a deployment workflow that runs after a successful build and tests, using AWS credentials stored in GitHub Secrets to push artifacts to an S3 bucket and invalidate CloudFront caches.

```yaml
name: Deploy to Production (AWS)

on:
  push:
    branches: [ main ]

permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Sync to S3
        run: |
          aws s3 sync build/ s3://my-app-prod --delete

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
```

### Line-by-line explanation
- name: Deploy to Production (AWS)
  - Names the deployment workflow.
- on: push to main
  - Triggers deployment when code lands on main.
- jobs/deploy
  - Defines a deploy job.
- steps/Checkout code
  - Checks out repository to access artifacts and code.
- steps/Set up Node.js
  - Installs Node.js 18 for the build environment.
- steps/Install dependencies
  - Installs dependencies in a clean environment.
- steps/Build
  - Builds the application (producing the production-ready artifacts in build/).
- steps/Configure AWS credentials
  - Uses AWS credentials stored as GitHub Secrets to authorize AWS CLI commands.
- steps/Sync to S3
  - Synchronizes the built artifacts to an S3 bucket intended as the production static asset store.
- steps/Invalidate CloudFront
  - Triggers CloudFront invalidation to ensure users receive the latest assets.

Note:
- Secrets used: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, CLOUDFRONT_DISTRIBUTION_ID should be configured in the repo's Settings > Secrets.
- If you deploy to a different target (e.g., ECS, Lambda, Heroku, or Vercel), adapt the steps accordingly.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Logging secrets to output
  Bad
  ```yaml
  - name: Debug secret
    run: echo "DEPLOY PASSWORD: ${{ secrets.DEPLOY_PASSWORD }}"
  ```
  Good
  ```yaml
  - name: Deploy without leaking secrets
    run: ./deploy.sh --password "${{ secrets.DEPLOY_PASSWORD }}"
  ```
  Explanation: Never print secrets to logs. Use secrets only as environment variables or pass them to scripts without exposing them.

- Pitfall 2: Not pinning action versions
  Bad
  ```yaml
  - uses: actions/checkout@latest
  ```
  Good
  ```yaml
  - uses: actions/checkout@v3
  ```
  Explanation: Pin actions to a known version to avoid breaking changes from “latest” updates.

- Pitfall 3: Skipping dependency caching
  Bad
  ```yaml
  - name: Install dependencies
    run: npm ci
  ```
  Good
  ```yaml
  - name: Cache npm
    uses: actions/cache@v3
    with:
      path: ~/.npm
      key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
  - name: Install dependencies
    run: npm ci
  ```
  Explanation: Caching accelerates builds and reduces toil during CI runs.

- Pitfall 4: Deploying on every push without gating tests
  Bad
  ```yaml
  - name: Deploy
    run: ./deploy.sh
  ```
  Good
  ```yaml
  - name: Run tests first
    run: npm test
  - name: Deploy after successful tests
    if: success()
    run: ./deploy.sh
  ```
  Explanation: Production deployments should gate on a successful CI run, not just on push.

---

## Y. Why This Matters In Real Systems — production context and real usage

- Reliability and velocity: CI accelerates feedback loops, catching issues early and preventing broken deployments.
- Reproducibility: Matrix builds and lockfiles ensure consistent environments across developers and CI runners.
- Security: Proper secrets handling prevents credential leakage and reduces blast radius if a workflow is compromised.
- Deploy discipline: Gate deployments with tests, linting, and security checks to minimize incident surfaces in production.
- Observability: Collecting coverage, test artifacts, and deployment logs provides an auditable trail for compliance and debugging.
- Cost and performance: Caching reduces compute and time-to-feedback, enabling more iterations per day without skyrocketing CI costs.

---

## Z. Study Questions — 5 recall questions

1) What is the purpose of actions/setup-node in a Node.js GitHub Actions workflow?  
2) Why is caching dependencies important in CI, and how is it typically implemented?  
3) How can you gate a production deployment so it only runs after tests pass?  
4) What are the risks of using a GitHub Actions step with uses: actions/checkout@latest, and how can you mitigate them?  
5) What steps would you take to add code coverage reporting to Codecov in a Node.js CI workflow?

---

## Exercise — a practical multi-part coding challenge

Part A: Scaffold a Node.js project with linting and tests
- Create a minimal Node.js project (package.json) with scripts:
  - "lint": "eslint ."
  - "test": "jest --coverage"
  - "build": "echo Build step"
- Add a simple module (e.g., lib/util.js) and a test that covers it with Jest.
- Add ESLint configuration that enforces basic rules.

Part B: Implement a basic CI workflow
- Add a GitHub Actions workflow that:
  - Triggers on push and PR to main.
  - Runs on a matrix of Node.js versions: 14.x, 16.x, 18.x.
  - Caches npm, installs via npm ci, runs lint (if present), and runs tests.
- Validate that the workflow appears in the Actions tab and passes for the initial commit.

Part C: Extend CI with coverage and artifacts
- Extend the workflow to run tests with coverage and upload the lcov.info to Codecov (or upload as an artifact if you don’t have Codecov access).
- Ensure the workflow remains green if coverage is produced.

Part D: Add a deployment workflow (AWS)
- Create a separate workflow that deploys to AWS S3 after a successful build/test.
- Use AWS credentials stored in GitHub Secrets (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY).
- Perform an S3 sync of the build output to a target bucket and invalidate CloudFront if you have a distribution ID stored as a secret.

Part E: Ensure best practices
- Pin action versions (e.g., actions/checkout@v3).
- Avoid printing secrets in logs.
- Demonstrate a failing test causing the CI to fail, and show how the PR status would reflect this.

Optional starter snippets you can adapt:
- Basic CI: provided in Section 1.
- Coverage/Codecov: provided in Section 2.
- AWS deployment: provided in Section 3.

Deliverables:
- A repository structure with: package.json, a simple lib/ module, __tests__ for Jest, a .eslintrc configuration, and one or more .github/workflows/*.yml files per Part A–D.
- A README with quick-start instructions to run locally and to review the CI results in GitHub Actions.
- Brief notes on how you would extend this for staging vs production environments (e.g., separate workflow files, environment protection rules, and branch-based protections).