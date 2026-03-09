# CI/CD: GitHub Actions Pipelines for Python Backend

Compelling introduction: CI/CD pipelines automate the lifecycle of a Python backend project—from code integration to testing, packaging, and deployment. GitHub Actions provides a first-class, language-agnostic runner ecosystem that integrates tightly with your GitHub repository. Mastery of CI/CD for Python means faster feedback loops, more reliable deployments, and safer releases in production systems.

## 1. CI/CD Concepts in GitHub Actions for Python

In this section, we cover the core building blocks of a GitHub Actions pipeline for a Python backend: workflows, jobs, steps, runners, caching, and common actions for Python environments. We’ll also illustrate a minimal workflow to get you started.

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install flake8
      - name: Lint with Flake8
        run: flake8 .
  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements-dev.txt
      - name: Run tests
        run: pytest -q
```

### Line-by-line explanation breaking down each line

- name: CI
  - Sets the human-readable name for the workflow shown on the Actions tab.
- on:
  - Defines events that trigger the workflow.
- push/pull_request
  - Run on pushes and PRs to the main branch for validation.
- workflow_dispatch
  - Allows manual triggering from the GitHub UI.
- jobs:
  - A collection of independent tasks that GitHub Actions will run.
- lint: and test: 
  - Two separate jobs to modularize linting and tests.
- runs-on: ubuntu-latest
  - Specifies the runner environment (Linux VM).
- steps:
  - Each job is composed of a sequence of steps.
- - uses: actions/checkout@v4
  - Checks out the repository so subsequent steps can access code.
- - uses: actions/setup-python@v5 with python-version: "3.11"
  - Sets up a specific Python interpreter version for reproducible builds.
- - name: Install dependencies / Run tests
  - Descriptive step names for readability in the Actions UI.
- run: |
  - Executes shell commands in a multi-line block.
- pip install flake8 / pytest -q
  - Installs linting and testing tooling; pytest runs the test suite.

## 2. Project Prep for CI: Python packaging, tests, and dev tooling

Before you wire CI, you should prepare your Python project so CI can install, lint, and test it reliably. Here are example file contents to represent a minimal but solid setup.

```text
# requirements-dev.txt
pytest>=7.0
pytest-cov
flake8
ruff
```

```toml
# pyproject.toml
[tool.pytest.ini_options]
addopts = "-v --cov=app --cov-report=xml"
testpaths = ["tests"]

[build-system]
requires = ["setuptools>=42", "wheel"]
build-backend = "setuptools.build_meta"

[tool.ruff]
line-length = 88
select = ["E", "F", "W"]
```

```python
# tests/test_example.py
def test_example():
    assert 1 + 1 == 2
```

```python
# app/main.py
def add(a: int, b: int) -> int:
    return a + b
```

### Line-by-line explanation breaking down each line

- requirements-dev.txt
  - Lists development dependencies (testing, linting, tooling).
- pyproject.toml
  - Configures pytest options, test discovery, and build system metadata.
  - [tool.pytest.ini_options] sets Pytest behavior and coverage reporting.
  - [build-system] declares build dependencies used when packaging the project.
  - [tool.ruff] configures the Ruff linter options.
- tests/test_example.py
  - Simple, deterministic test ensuring the test framework is wired up.
- app/main.py
  - A minimal function under test that CI could exercise in a real project.
```

## 3. Creating a full GitHub Actions workflow for Python: lint, test, and optional packaging

This section shows a more complete workflow: lint with multiple linters, tests with a Python version matrix, and optional packaging/build. It also demonstrates dependency caching and optional PyPI publishing guardrails.

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - uses: actions/cache@v3
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('requirements*.txt') }}
          restore-keys: |
            ${{ runner.os }}-pip-
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements-dev.txt
      - name: Lint with Ruff
        run: |
          ruff --version
          ruff .
      - name: Lint with Flake8
        run: flake8 .

  test:
    needs: lint
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.9', '3.10', '3.11']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements-dev.txt
      - name: Run tests
        run: pytest -q --cov=app --cov-report=xml
      - name: Upload coverage
        if: always()
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Install build tools
        run: |
          python -m pip install --upgrade pip
          pip install build
      - name: Build wheel
        run: python -m build --wheel --outdir dist

  publish:
    if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/')
    needs: [build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install build tooling
        run: |
          python -m pip install --upgrade pip
          pip install twine
      - name: Publish to PyPI
        env:
          TWINE_USERNAME: ${{ secrets.PYPI_USERNAME }}
          TWINE_PASSWORD: ${{ secrets.PYPI_PASSWORD }}
        run: |
          python -m twine upload dist/* --non-interactive
```

### Line-by-line explanation breaking down each line

- name: CI
  - Workflow name displayed in Actions UI.
- on:
  - Event triggers: push to main, PRs to main, manual dispatch.
- lint, test, build, publish
  - Independent jobs with clear responsibilities.
- uses: actions/checkout@v4
  - Checks out repository code for subsequent steps.
- uses: actions/setup-python@v5 with python-version
  - Ensures a known Python runtime per job or per matrix.
- uses: actions/cache@v3
  - Caches pip artifacts to speed up consecutive runs.
- Install dependencies
  - Installs development dependencies and tooling for lint/test.
- Run tests
  - Executes tests with coverage reporting.
- Upload coverage
  - Integrates with Codecov for coverage visualization.
- Build wheel
  - Packages the project into a wheel for distribution.
- Publish to PyPI
  - Publishes to PyPI using stored credentials (via secrets).

## 4. Advanced topics: caching strategies and matrix builds for broader coverage

To maximize reliability and speed, you should consider caching dependencies and running tests across multiple Python versions.

```yaml
name: CI with Cache and Matrix

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.9', '3.10', '3.11']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - uses: actions/cache@v3
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ matrix.python-version }}-${{ hashFiles('requirements-dev.txt') }}
          restore-keys: |
            ${{ runner.os }}-pip-${{ matrix.python-version }}-
            ${{ runner.os }}-pip-
      - name: Install
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements-dev.txt
      - name: Run tests
        run: pytest -q
```

### Line-by-line explanation breaking down each line

- on: [push, pull_request]
  - Triggers on push or PRs to trigger CI across all supported versions.
- strategy.matrix python-version
  - Tests run in parallel across multiple Python runtimes for compatibility.
- uses: actions/cache@v3 with key
  - Cache layout includes Python version to avoid cross-version cache misses.
- Install / Run tests
  - Standard installation and test steps, leveraging cached dependencies when possible.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

Pitfall 1: Not using setup-python to pin Python version
- Bad:
```yaml
# .github/workflows/ci.yml
name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: pip install -r requirements.txt
      - run: pytest
```
- Good:
```yaml
name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - uses: actions/cache@v3
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('requirements.txt') }}
      - run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
      - run: pytest
```

Pitfall 2: Skipping dependency caching
- Bad:
```yaml
- name: Install dependencies
  run: |
    python -m pip install -r requirements-dev.txt
```
- Good:
```yaml
- uses: actions/cache@v3
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('requirements-dev.txt') }}
- name: Install dependencies
  run: |
    python -m pip install --upgrade pip
    pip install -r requirements-dev.txt
```

Pitfall 3: Not gating tests behind PRs or not failing on test failures
- Bad:
```yaml
- name: Run tests
  run: pytest -q || true
```
- Good:
```yaml
- name: Run tests
  run: pytest -q
```

Pitfall 4: Exposing secrets in logs or configuring publishing insecurely
- Bad:
```yaml
- name: Publish to PyPI
  run: |
    echo "Username: $PYPI_USERNAME"
```
- Good:
```yaml
- name: Publish to PyPI
  env:
    TWINE_USERNAME: ${{ secrets.PYPI_USERNAME }}
    TWINE_PASSWORD: ${{ secrets.PYPI_PASSWORD }}
  run: |
    python -m twine upload dist/* --non-interactive
```

## Y. Why This Matters In Real Systems — production context and real usage

- Faster feedback and higher productivity: CI catches issues early, reducing the cost of defects discovered in staging or production.
- Consistency across environments: Using a defined Python version and pinned dependencies eliminates “it works on my machine” bugs.
- Quality gates for deployments: Linting, type checks, and test coverage ensure code health before release.
- Safe, automated deployments: Optional publishing, canaries, or blue/green deployments can be wired to CI to promote confidence before public usage.
- Auditability and compliance: CI logs and artifact traces provide an auditable trail of what was built, tested, and released.

## Z. Study Questions — 5 recall questions

1. What is the difference between a GitHub Actions workflow, a job, and a step?
2. Why should you cache pip dependencies in CI, and how is it typically keyed?
3. How can you run tests against multiple Python versions in a single workflow?
4. What is the purpose of secrets in GitHub Actions, and why should you avoid printing them?
5. Name two best practices when designing a CI workflow for a Python backend.

## Exercise — practical multi-part coding challenge

Part A: Bootstrap a minimal Python package
- Create a new directory structure for a Python package named my_backend with:
  - my_backend/__init__.py
  - my_backend/utils.py containing a function multiply(a, b) -> int
  - tests/test_utils.py with tests for multiply
- Add a simple requirements-dev.txt with pytest and a basic pytest.ini or pyproject.toml configuration as shown above.

Part B: Write a GitHub Actions workflow
- Create .github/workflows/ci.yml that:
  - Triggers on push to main and PRs.
  - Pins Python to 3.11.
  - Installs dependencies from requirements-dev.txt.
  - Runs Ruff lint, Flake8 lint, and pytest with coverage.
  - Caches pip dependencies.

Part C: Extend the workflow to test across multiple versions
- Update the workflow to use a matrix: python-version: [3.9, 3.10, 3.11].
- Ensure the cache key includes the Python version and the requirements file hash.

Part D: Optional – publish to PyPI on tag
- Extend the workflow with a publish job that triggers only on tag pushes and uses secrets.PYPI_USERNAME and secrets.PYPI_PASSWORD to upload dist/* via twine.

Deliverables you should produce for this exercise:
- The package skeleton (files and directories).
- The test and util function implementations.
- A functional CI workflow that passes locally when run in GitHub Actions.
- An optional expanded workflow for multi-version testing and PyPI publishing.

Notes
- Keep your code modular to support future expansion (e.g., additional tests, performance benchmarks).
- Aim for clear, maintainable CI configurations—comment or name steps in a way that teammates understand quickly.
- The exercises assume a GitHub repository context; if you’re practicing locally, you can simulate parts of the workflow logic with shell scripts or local test runners.