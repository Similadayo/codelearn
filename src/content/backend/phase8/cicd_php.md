# Track: Backend Engineering — Module: Phase 8 — Infrastructure & Deployment — Topic: CI/CD — GitHub Actions Pipelines (PHP)

CI/CD pipelines are the nervous system of modern backend systems. For PHP apps, GitHub Actions provides a robust, scalable, and cost-effective way to automate testing, linting, packaging, and deployment. This lesson covers how to design PHP-centric CI/CD pipelines with GitHub Actions, including environment setup, tests, static analysis, artifact creation, and production deployment, all with secure secret handling and real-world deployment considerations.

## 1. GitHub Actions Fundamentals for PHP Projects

This section introduces a minimal, reliable PHP CI workflow: on push and pull requests to main, it checks out the code, sets up PHP, caches dependencies, installs Composer packages, and runs PHPUnit tests. This foundation is essential for any PHP project aiming for fast feedback and reproducible environments.

```yaml
name: PHP CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        php-version: ['8.0', '8.1', '8.2']

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: actions/setup-php@v5
        with:
          php-version: ${{ matrix.php-version }}
          extensions: mbstring, curl, json

      - name: Cache Composer dependencies
        uses: actions/cache@v3
        with:
          path: vendor
          key: ${{ runner.os }}-composer-${{ hashFiles('**/composer.lock') }}
          restore-keys: |
            ${{ runner.os }}-composer-

      - name: Install dependencies
        run: composer install --no-interaction --prefer-dist --no-progress --no-suggest

      - name: Run unit tests
        run: vendor/bin/phpunit --configuration phpunit.xml
```

### Line-by-line explanation
- name: PHP CI — Names the workflow for easy identification in GitHub Actions UI.
- on: Triggers the workflow on pushes to main and on pull requests targeting main to ensure code is tested in multiple contexts.
- jobs.test: Defines a single job named "test" that runs on an Ubuntu runner.
- matrix.php-version: Creates a matrix to test against PHP 8.0, 8.1, and 8.2 for broader compatibility.
- uses: actions/checkout@v4 — Checks out the repository so the workflow can access code.
- uses: actions/setup-php@v5 — Sets up the PHP runtime and specified extensions.
- Cache step — Caches the vendor directory keyed by OS and composer.lock to speed up subsequent runs.
- Install dependencies — Runs composer install to install PHP dependencies.
- Run unit tests — Executes PHPUnit tests using the project's phpunit.xml configuration.

## 2. PHP Environment Engineering: Setup, Caching, and Linting

Beyond basic tests, a robust pipeline also validates syntax, linting, and static analysis. This section shows how to configure a workflow that includes syntax checks and a PHPStan/PHPCS-like static analysis step, alongside tests, with a PHP 8.1/8.2 matrix.

```yaml
name: PHP CI with Lint + Static Analysis

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        php-version: ['8.1', '8.2']

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: actions/setup-php@v5
        with:
          php-version: ${{ matrix.php-version }}
          extensions: mbstring, curl, json

      - name: Cache Composer dependencies
        uses: actions/cache@v3
        with:
          path: vendor
          key: ${{ runner.os }}-composer-${{ hashFiles('**/composer.lock') }}
          restore-keys: |
            ${{ runner.os }}-composer-

      - name: Install dependencies
        run: composer install --no-interaction --prefer-dist --no-progress --no-suggest

      - name: PHP syntax check
        run: find . -name '*.php' -print0 | xargs -0 -n1 php -l

      - name: Static analysis (PHPStan-like)
        run: |
          composer require --no-interaction --ansi --dev phpstan/phpstan
          vendor/bin/phpstan analyse || true

      - name: Run unit tests
        run: vendor/bin/phpunit --configuration phpunit.xml
```

### Line-by-line explanation
- name: PHP CI with Lint + Static Analysis — Describes the enhanced QA steps.
- matrix.php-version: Tests across PHP 8.1 and 8.2 for broader coverage.
- PHP syntax check: Iterates over PHP files and runs php -l to catch syntax errors early.
- Static analysis step: Installs and runs PHPStan-like analysis to catch type issues and potential bugs before runtime.
- All other steps are analogous to the previous section: checkout, setup, cache, install, tests.

## 3. Building, Archiving, and Artifacts for Deployment

CI pipelines often produce artifacts (e.g., a packaged app) to deploy to staging/production. This section shows how to create a deployment-ready ZIP artifact of the PHP app, including a simple manifest and ensuring dependencies are in place.

```yaml
name: PHP Build Artifacts

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-artifact:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: actions/setup-php@v5
        with:
          php-version: '8.2'
          extensions: mbstring, curl, json

      - name: Install dependencies
        run: composer install --no-interaction --prefer-dist --no-progress --no-suggest

      - name: Prepare artifact
        run: |
          mkdir -p dist
          rsync -a --exclude='.git' --exclude='vendor/*' ./ dist/app/
          # Copy vendor separately to optimize deploys if you only want to deploy src
          zip -r dist/app.zip dist/app

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: php-app-artifact
          path: dist/app.zip
```

### Line-by-line explanation
- name: PHP Build Artifacts — Names the build artifact workflow.
- Prepare artifact — Creates a dist/app directory containing the application source (excluding VCS metadata) and zips it into dist/app.zip for deployment.
- Upload artifact — Uploads the ZIP to GitHub as a workflow artifact so downstream workflows (e.g., deployment) can access it.

## 4. Deploying PHP Apps to Staging/Production with SSH

Deployments should be secure, reproducible, and require minimal human intervention. This section demonstrates a deployment workflow that fetches an artifact and deploys it to a remote server via SSH, using secrets for credentials and a post-deploy script hook.

```yaml
name: Deploy PHP App to Server

on:
  push:
    branches: [ staging, main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: [build-artifact]
    permissions:
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Download artifact
        uses: actions/download-artifact@v3
        with:
          name: php-app-artifact
          path: ./artifacts

      - name: Setup SSH (SSH-agent)
        uses: webfactory/ssh-agent@v0.5.3
        with:
          ssh-private-key: ${{ secrets.DEPLOY_SSH_KEY }}

      - name: Deploy to server
        run: |
          set -e
          APP_DIR="/var/www/php-app"
          scp ./artifacts/php-app-artifact/app.zip "$${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }}:$APP_DIR/app.zip"
          ssh "${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }}" "set -e
            cd $APP_DIR
            unzip -o app.zip
            rm -f app.zip
            composer install --no-dev --prefer-dist --optimize-autoloader
            bash bin/deploy.sh || true
          "
```

### Line-by-line explanation
- name: Deploy PHP App to Server — Names the deployment workflow.
- Setup SSH — Uses an SSH key stored in GitHub Secrets to enable passwordless SSH on the target server.
- Deploy to server — Transfers the artifact to the server, unpacks it, runs composer install, and invokes a deployment script (bin/deploy.sh) for any post-deploy tasks.
- bin/deploy.sh can handle migrations, cache clearing, or service restarts as part of the post-deploy phase.

Note: The deploy script bin/deploy.sh is a good practice to centralize server-side steps and keep your workflow concise. Adapt the server commands to your stack (nginx/php-fpm reload, migrations, cache clear, etc.).

## 5. Secrets, Environments, and Access Control in GitHub Actions

Security and separation of environments are critical in production. This section demonstrates best practices around secrets, environment protection, and limiting permissions for deployment workflows.

```yaml
name: PHP CI + Deploy with Secrets

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11' # Optional: for auxiliary tooling
      - name: Install dependencies
        run: |
          curl -sS https://getcomposer.org/installer | php
          php composer.phar install --no-interaction --prefer-dist --no-progress
      - name: Run tests
        run: vendor/bin/phpunit --configuration phpunit.xml

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://${{ secrets.PROD_DOMAIN }}
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: webfactory/ssh-agent@v0.5.3
        with:
          ssh-private-key: ${{ secrets.DEPLOY_SSH_KEY }}
      - name: Deploy to production server
        run: |
          ssh -o StrictHostKeyChecking=no ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} "
            set -e
            cd /var/www/php-app
          "
```

### Line-by-line explanation
- Environment and secrets usage: The workflow defines a production environment and uses secrets securely to access the target server.
- Deploy job: Runs only on the main branch; uses SSH keys stored as secrets to establish a secure connection.
- Guardrail: Production environment is protected and can be paused or restricted via environment protection rules.

## X. Common Beginner Mistakes — 3+ Real Pitfalls (with Bad vs Good code)

| Common Beginner Mistake | Bad Practice (Code Snippet) | Good Practice (Code Snippet) |
|---|---|---|
| 1) No tests or tests only on PR, not on push | Bad: on: pull_request only | Good: also test on push to main; separate PR and push workflows as needed |
|  | ```yaml\non:\n  pull_request:\n    branches: [ main ]\n``` | ```yaml\non:\n  push:\n    branches: [ main ]\n  pull_request:\n    branches: [ main ]\n``` |
| 2) Never caching dependencies; slow feedback | Bad: composer install on every run without cache | Good: composer cache keyed on composer.lock |
|  | ```yaml\n- name: Install dependencies\n  run: composer install``` | ```yaml\n- name: Cache Composer dependencies\n  uses: actions/cache@v3\n  with:\n    path: vendor\n    key: ${{ runner.os }}-composer-${{ hashFiles('**/composer.lock') }}\n- name: Install dependencies\n  run: composer install --no-interaction --prefer-dist --no-progress --no-suggest``` |
| 3) Hard-coding secrets or credentials in the workflow | Bad: secrets embedded directly in YAML | Good: use GitHub Secrets with environment protection |
|  | ```yaml\n- name: Deploy\n  env:\n    DB_PASSWORD: \"supersecret\"```\n``` | ```yaml\n- name: Deploy\n  env:\n    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}\n- run: ./deploy.sh```\n``` |
| 4) Deploys without environment separation or approvals | Bad: deploy to production on every push | Good: separate staging and production with required approvals and protected environments |
|  | ```yaml\non:\n  push:\n    branches: [ main ]\n``` | ```yaml\non:\n  push:\n    branches: [ staging, main ]\n  environments:\n    production:\n      url: https://prod.example.com\n``` |

## Y. Why This Matters In Real Systems — Production Context and Real Usage

- Reproducible environments: CI runs in clean VM images, ensuring tests pass in a predictable environment and reducing "works on my machine" issues.
- Faster feedback loops: Parallel matrix builds (multiple PHP versions) catch compatibility issues early, reducing regressions.
- Immutable artifacts: Packaging the app into a ZIP or tarball creates a stable artifact, enabling predictable deployments and easy rollbacks.
- Environment parity: Staging mirrors production as closely as possible in terms of PHP version, extensions, and libraries, minimizing surprises when promoting releases.
- Security and governance: Secrets are stored securely in GitHub Secrets, workflows can be protected with required approvals, and deployments can be tied to specific environments (staging, production) with access controls.
- Observability and traceability: Each deployment is traceable to a workflow run, making audits straightforward. Artifacts and logs provide a clear trail of changes.
- Rollback and canary strategies: CI/CD pipelines make it easier to implement canary deployments or quick rollbacks by promoting controlled release signals and maintaining quick access to previous artifacts.

## Z. Study Questions — 5 Recall Questions

1) What are the primary purposes of a CI/CD pipeline in a PHP backend, and how does GitHub Actions help achieve them?
2) How can you implement a PHP version matrix in a GitHub Actions workflow, and why is this important?
3) Why is caching Composer dependencies beneficial in CI, and how is it configured in a workflow?
4) Describe a secure pattern for deploying PHP code to a production server using GitHub Actions. What secrets are needed?
5) What are common pitfalls when setting up CI/CD for PHP projects, and how can you mitigate them?

## Exercise — Practical Multi-Part Coding Challenge

Part A — Create a Minimal PHP Project with Tests
- Create a new PHP project (or use an existing small one) with:
  - composer.json requiring PHP ^8.0
  - A simple class, e.g., src/Greeting.php with a method greet($name) returning "Hello, $name!"
  - PHPUnit tests in tests/GreetingTest.php validating greet('World') returns "Hello, World!"
  - phpunit.xml configuration file
- Run tests locally to verify.

Part B — Add GitHub Actions CI for PHP
- Add a GitHub Actions workflow at .github/workflows/php-ci.yml that:
  - Triggers on push to main and PRs
  - Builds on PHP 8.1 and 8.2
  - Caches Composer dependencies
  - Installs dependencies and runs PHPUnit
- Ensure the workflow passes on your repository.

Part C — Build and Archive Artifacts
- Extend the workflow to add a job or step that builds a ZIP artifact of the app (src and vendor) excluding .git, and uploads it as an artifact named php-app-artifact.
- Validate the artifact appears in the workflow run artifacts.

Part D — Deploy to a Staging Server (Simulated)
- Create a local or remote staging server (or simulate via a local script) and configure a GitHub Secrets-based deployment flow:
  - DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY
- Add a deployment workflow that uses SSH to copy the artifact to the staging server and runs a post-deploy script bin/deploy.sh on the server.
- If you don’t have a real server, mock the deployment step by printing commands instead of executing them.

Part E — Security and Best Practices Reflection
- Document at least 3 security best practices you applied (e.g., using secrets, least-privilege access, environment protection) and explain how they reduce risk in real-world deployments.

Deliverables
- A small PHP project with tests that pass locally.
- A GitHub Actions workflow for CI (and optionally artifact packaging).
- A deployment workflow that uses SSH and secrets (can be simulated if no server is available).
- A short reflection on security and deployment best practices.

This completes a practical, end-to-end lesson on CI/CD pipelines for PHP with GitHub Actions, covering fundamentals, PHP-focused configurations, artifacts, deployment, security, and real-world considerations.