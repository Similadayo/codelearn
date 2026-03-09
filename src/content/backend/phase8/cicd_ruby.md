# Track: Backend Engineering — Phase 8 — Infrastructure & Deployment — CI/CD — GitHub Actions Pipelines (Ruby)

CI/CD is the automation backbone of modern backend engineering. For Ruby backends, GitHub Actions provides a powerful, integrated way to build, test, lint, and deploy your services with minimal manual intervention. This lesson covers how to design and implement robust GitHub Actions pipelines tailored for Ruby apps, focusing on reliability, speed, security, and real-world deployment scenarios.

## 1. CI/CD Essentials for Ruby Backends

In Ruby projects, CI/CD should validate code on every push or pull request, ensure tests pass, enforce style, and optionally deploy to staging or production. A minimal pipeline typically includes: checkout, setup Ruby, install dependencies, run tests, and report results. The following workflow demonstrates a basic, production-ready skeleton you can adapt.

```yaml
name: Ruby CI
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.1'
      - name: Install dependencies
        run: |
          gem install bundler
          bundle install --jobs 4 --retry 3
      - name: Run RSpec tests
        run: bundle exec rspec
```

### Line-by-line explanation
- name: Ruby CI — labels the workflow.
- on: triggers the workflow on pushes and PRs to main.
- jobs.test: defines a single job named test.
- runs-on: ubuntu-latest: uses the latest Ubuntu runner.
- steps: sequence of actions to perform.
- - uses: actions/checkout@v3: checks out the repository.
- - uses: ruby/setup-ruby@v1: sets up the Ruby environment.
- with ruby-version: '3.1': selects Ruby 3.1 for the run.
- - name: Install dependencies: a human-friendly step name.
- run: bundler and bundle install: installs dependencies with Bundler.
- - name: Run RSpec tests: runs the Ruby test suite.
- run: bundle exec rspec: executes tests with RSpec.

## 2. Structuring a Ruby GitHub Actions Workflow

A production-grade project often needs to test across multiple Ruby versions and maintainable caching. The following example adds a matrix for Ruby versions and caches Bundler dependencies to speed up builds.

```yaml
name: Ruby CI
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        ruby-version: ['3.1', '3.2']
        include:
          - ruby-version: '3.1'
            env: 'test'
          - ruby-version: '3.2'
            env: 'test'
    steps:
      - uses: actions/checkout@v3
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: ${{ matrix.ruby-version }}
      - name: Cache Bundler
        uses: actions/cache@v4
        with:
          path: vendor/bundle
          key: ${{ runner.os }}-bundler-${{ matrix.ruby-version }}-${{ hashFiles('**/Gemfile.lock') }}
      - name: Install dependencies
        run: bundle install --jobs 4 --retry 3
      - name: Run RSpec
        run: bundle exec rspec
```

### Line-by-line explanation
- name: Ruby CI — workflow name.
- on: triggers on pushes and PRs to main/develop branches.
- jobs.test: defines a test job with a matrix strategy.
- strategy: fail-fast is false to allow parallelism and collect all failures.
- matrix: runs the job for Ruby 3.1 and 3.2.
- steps: sequence of actions to perform.
- - uses: actions/checkout@v3: fetches code.
- - uses: ruby/setup-ruby@v1: installs the specified Ruby version per matrix.
- - name: Cache Bundler: prepares caching for Bundler gems.
- uses: actions/cache@v4: GitHub Action caching feature.
- with path: vendor/bundle: caches Bundler-installed gems.
- key: unique cache key per OS, Ruby version, and Gemfile.lock state.
- - name: Install dependencies: installs gems with Bundler.
- run: bundle install --jobs 4 --retry 3: parallel install with retries.
- - name: Run RSpec: runs tests for the selected Ruby version.
- run: bundle exec rspec: executes the test suite.

## 3. Linting, Testing, and Reporting in CI

Beyond just running tests, you should enforce code quality with RuboCop and expose test results for review. The example below runs RuboCop, tests with RSpec, and emits a JUnit-style report for downstream tooling and CI dashboards.

```yaml
name: Ruby Lint & Tests
on: [push, pull_request]
jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.1'
      - name: Install dependencies
        run: bundle install --jobs 4 --retry 3
      - name: RuboCop
        run: bundle exec rubocop
      - name: RSpec (JUnit)
        run: bundle exec rspec --format RspecJunitFormatter --out tmp/rspec.xml
      - name: Upload RSpec results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: rspec-junit
          path: tmp/rspec.xml
```

### Line-by-line explanation
- name: Ruby Lint & Tests — identifies the workflow.
- on: triggers on push and PR events.
- jobs.lint-test: a single job named lint-test.
- - uses: actions/checkout@v3: fetches the code.
- - uses: ruby/setup-ruby@v1: sets Ruby to 3.1.
- - name: Install dependencies: runs bundle install.
- run: bundle install --jobs 4 --retry 3: installs dependencies efficiently.
- - name: RuboCop: runs the linter.
- run: bundle exec rubocop: executes RuboCop to enforce style and standards.
- - name: RSpec (JUnit): runs tests with a JUnit formatter.
- run: bundle exec rspec --format RspecJunitFormatter --out tmp/rspec.xml: outputs JUnit-style results.
- - name: Upload RSpec results: uploads artifacts for review.
- if: always(): ensures artifacts are uploaded even if tests fail.
- uses: actions/upload-artifact@v4: artifact upload action.
- with: name: rspec-junit, path: tmp/rspec.xml: provides a named artifact.

## 4. Performance Tweaks: Caching, Parallelism, and Artifacts

Speed in CI is critical. Caching dependencies, running in parallel where safe, and producing artifacts (logs, reports) improves feedback time and post-run analysis. The following example adds Bundler caching and stores a test report as an artifact.

```yaml
name: Ruby CI - Performance
on: [push]
jobs:
  fast-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.1'
      - name: Cache Bundler
        uses: actions/cache@v4
        with:
          path: vendor/bundle
          key: ${{ runner.os }}-bundler-${{ hashFiles('**/Gemfile.lock') }}
      - name: Install dependencies
        run: bundle install --jobs 4 --retry 3
      - name: Run tests (short)
        run: bundle exec rspec --format documentation
      - name: Save artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-docs
          path: spec/reports
```

### Line-by-line explanation
- name: Ruby CI - Performance — labels the optimization-focused workflow.
- on: triggers on push only to keep CI cheap for feature branches.
- jobs.fast-build: a job focusing on fast feedback.
- - uses: actions/checkout@v3: fetches code.
- - uses: ruby/setup-ruby@v1: installs Ruby 3.1.
- - name: Cache Bundler: preserves gem installations between runs.
- uses: actions/cache@v4: caching action.
- with: path and key: caches vendor/bundle using Gemfile.lock as the key.
- - name: Install dependencies: installs the gems.
- run: bundle install --jobs 4 --retry 3: efficient installation.
- - name: Run tests (short): executes a quick test pass.
- run: bundle exec rspec --format documentation: runs tests.
- - name: Save artifacts: stores outputs for review.
- if: always(): ensures artifacts are captured even if tests fail.
- uses: actions/upload-artifact@v4: artifact storage action.
- with: name and path: stores test docs under test-docs.

## 5. Deployments: Building and Deploying Ruby Apps

CI is only part of the story; CD completes the loop by delivering changes to environments. One common pattern is building a Docker image and pushing it to a registry, then deploying to a container service. The example below demonstrates building and pushing to GitHub Container Registry (GHCR) when merging to main.

```yaml
name: Build & Push Docker (GHCR)
on:
  push:
    branches: [ main ]
jobs:
  docker:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-qemu-action@v1
      - uses: docker/setup-buildx-action@v1
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.1'
      - name: Build Docker image
        run: |
          docker build -t ghcr.io/${{ github.repository }}/my-ruby-app:${{ github.sha }} .
      - name: Log in to GHCR
        run: |
          echo "${{ secrets.GHCR_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
      - name: Push Docker image
        run: |
          docker push ghcr.io/${{ github.repository }}/my-ruby-app:${{ github.sha }}
```

### Line-by-line explanation
- name: Build & Push Docker (GHCR) — identifies the deployment-focused workflow.
- on: triggers on pushes to main, typically a stable branch.
- jobs.docker: defines a single job for Docker-related steps.
- runs-on: ubuntu-latest: uses the latest Ubuntu runner.
- permissions: grants read access to contents and write access to packages (for pushing images).
- - uses: actions/checkout@v3: checks out code.
- - uses: docker/setup-qemu-action@v1 and - uses: docker/setup-buildx-action@v1: enable multi-arch builds and advanced Docker builds.
- - uses: ruby/setup-ruby@v1: ensures Ruby 3.1 is available for any build-time tasks.
- - name: Build Docker image: builds the container image with a tag that includes the commit SHA.
- - name: Log in to GHCR: authenticates to GitHub Container Registry.
- - name: Push Docker image: pushes the image to GHCR using the commit SHA tag.

## X. Common Beginner Mistakes

Bad vs Good: 3+ pitfalls with concrete code comparisons.

1) Not pinning Ruby version in workflow
- Bad:
```yaml
- uses: ruby/setup-ruby@v1
  with:
    ruby-version: ''
```
- Good:
```yaml
- uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.1.2'
```

2) Not caching dependencies, leading to longer builds
- Bad:
```yaml
- name: Install dependencies
  run: bundle install
```
- Good:
```yaml
- name: Cache Bundler
  uses: actions/cache@v4
  with:
    path: vendor/bundle
    key: ${{ runner.os }}-bundler-${{ hashFiles('**/Gemfile.lock') }}
- name: Install dependencies
  run: bundle install --jobs 4 --retry 3
```

3) Exposing secrets in logs or environment
- Bad:
```yaml
- name: Deploy
  run: echo "TOKEN=${{ secrets.DEPLOY_TOKEN }}"
```
- Good:
```yaml
- name: Deploy
  env:
    DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
  run: |
    deploy-tool --token "$DEPLOY_TOKEN"
```

4) Running deployments on every PR or push to any branch
- Bad:
```yaml
on: [push]
```
- Good:
```yaml
on:
  push:
    branches: [ main ]
```
- Add a guard for PRs to a protected branch:
```yaml
if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

5) Skipping tests for feature branches
- Bad:
```yaml
- name: Run tests
  if: false
  run: bundle exec rspec
```
- Good:
```yaml
- name: Run tests
  if: github.event_name != 'pull_request' || github.base_ref == 'main'
  run: bundle exec rspec
```

## Y. Why This Matters In Real Systems

In production, CI/CD is the guardrail that ensures changes are safe, tested, and reproducible. Benefits include:
- Faster feedback: developers learn about regressions in minutes, not days.
- Consistent environments: CI uses the same OS, Ruby version, gemsets, and tooling as staging/production.
- Reliability and auditability: builds, tests, and deployments are captured in CI logs and artifacts, enabling traceability and rollback if needed.
- Security hygiene: secrets are injected securely, not embedded in code, and access can be audited.
- Deployment discipline: controlled promotions (feature → staging → production) reduce risk and enable canary or blue/green strategies.
- Observability: artifacts, test reports, and deployment logs provide visibility into what changed and why.

In real systems, you typically:
- Use a matrix to validate across Ruby versions and environments.
- Cache dependencies to speed up pipelines.
- Separate linting and tests to ensure fast fail-fast on style violations.
- Deploy to staging on pushes to develop and to production on merges to main.
- Monitor builds and failures, alert on flakiness, and auto-rollback if deployment fails health checks.

## Z. Study Questions

1) What are the main triggers for a typical Ruby GitHub Actions pipeline?
2) How does caching Bundler dependencies improve CI performance?
3) Why should you use a matrix strategy when testing Ruby applications?
4) How do you securely pass secrets to a GitHub Actions workflow without printing them?
5) What are key considerations when deploying Ruby apps via Docker in CI/CD?

## Exercise

Part A — Create a Ruby app and baseline tests
- Create a small Ruby library with a simple class:
  - Class: Calculator
  - Method: add(a, b) -> a + b
  - Method: subtract(a, b) -> a - b
- Add a Gemfile with gems: rspec, rubocop
- Add an RSpec spec for Calculator
- Add RuboCop config to enforce a basic style

Part B — Implement a GitHub Actions CI workflow
- Create .github/workflows/ci.yml with:
  - Ruby 3.1
  - Bundler install with caching
  - RuboCop lint
  - RSpec tests
  - Generate RSpec JUnit reports and upload as artifact

Part C — Dockerize the app (optional but recommended)
- Add a Dockerfile that builds the Ruby app with Bundler and runs a minimal command to demonstrate startup.

Part D — Extend CI to push a Docker image to GHCR on main
- Update or add a workflow to build a Docker image and push to GHCR using a PAT stored as a secret GHCR_TOKEN.

Part E — Verification steps
- Ensure:
  - Ruby version pinned to 3.1.x in the workflow
  - Bundler cache is used
  - RuboCop passes
  - RSpec tests pass and produce a JUnit report
  - Docker image is built and can be pushed to GHCR for main branch commits

Hands-on Deliverables
- A Ruby project with Gemfile, Calculator class, and rspec tests.
- A GitHub Actions workflow illustrating a stable CI/CD pipeline for Ruby.
- Optional Dockerfile and GHCR-based deployment steps.
- A short README explaining how to run locally, how the pipeline behaves, and how to extend it for staging/production.

This lesson equips you to design, implement, and operate practical CI/CD pipelines for Ruby backends, aligning development velocity with production reliability.