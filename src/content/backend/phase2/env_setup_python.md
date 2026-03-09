# Setting Up a Professional Dev Environment for Python Backend

A professional developer environment is the foundation of reliable, scalable backend systems. It ensures reproducible builds, consistent toolchains across machines, faster onboarding, easier collaboration, and safer integration with CI/CD pipelines. This lesson walks you through practical steps, concrete tooling choices, and production-facing practices to set up a robust Python backend development environment.

## 1. 1. Project Setup and Version Control

Establish a clean project layout, a baseline dependency management workflow, and a git-backed project skeleton that works across team members and machines.

```bash
# Initialize project structure
mkdir -p backend_project/app
cd backend_project

# Initialize git repo
git init

# Basic ignore patterns for Python projects
cat > .gitignore << 'IGNORE'
venv/
.build/
dist/
*.egg-info/
__pycache__/
.pytest_cache/
.env
.env.*.local
.values
coverage.xml
IGNORE

# Create a minimal Python source package
cat > app/__init__.py << 'PY'
# Package initializer
PY

# Create a simple entry module (example)
cat > app/main.py << 'PY'
def hello():
    return {"status": "ok"}

if __name__ == "__main__":
    print(hello())
PY

# Basic dev dependencies (dev-only; production may differ)
cat > requirements-dev.txt << 'REQ'
black>=24.0.0
isort>=5.12.0
flake8>=6.0
pytest>=8.0
python-dotenv>=1.0
mypy>=1.0
Req

REQ

# Create a Python virtual environment and install dev deps
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements-dev.txt
```

### Line-by-line explanation
- mkdir -p backend_project/app: Creates a project root with an app package directory structure.
- cd backend_project: Changes into the project directory.
- git init: Initializes a new Git repository for version control.
- .gitignore: Lists common patterns to keep out vendored, generated, or sensitive files from source control.
- app/__init__.py and app/main.py: Provide a minimal Python package with a simple endpoint to bootstrap development.
- requirements-dev.txt: Captures development tooling (formatters, linters, tests, etc.).
- python3 -m venv .venv: Creates an isolated Python environment for this project.
- source .venv/bin/activate: Activates the virtual environment (UNIX-like shells).
- pip install --upgrade pip and pip install -r requirements-dev.txt: Installs a deterministic set of dev tooling.

## 2. 2. Python Version Management with pyenv

Consistency across machines often means pinning a specific Python version. pyenv lets you install and switch Python versions per-project or per-user.

```bash
# Install pyenv (example for UNIX-like systems)
curl https://pyenv.run | bash

# Add pyenv to your shell startup script (bash example)
cat >> ~/.bashrc << 'EOF'
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init --path)"
eval "$(pyenv init -)"
EOF

# Reload shell and install a specific Python version
source ~/.bashrc
pyenv install 3.11.5
pyenv local 3.11.5
```

### Line-by-line explanation
- curl https://pyenv.run | bash: Installs pyenv via its official installer script.
- The subsequent cat block updates your shell so pyenv can manage Python versions.
- source ~/.bashrc: Applies the shell configuration changes.
- pyenv install 3.11.5: Downloads and compiles Python 3.11.5.
- pyenv local 3.11.5: Sets the local (per-project) Python version to 3.11.5.

## 3. 3. Virtual Environments & Dependency Management

A reproducible dependency story is essential. Use a virtual environment and a clear dependency file strategy (requirements.txt or Poetry/pyproject.toml).

```bash
# Ensure the project uses the pyenv-managed Python
pyenv which python  # should point to ~/.pyenv/.../bin/python

# Create/activate a venv (if not already)
python -m venv .venv
source .venv/bin/activate

# Dependency management options (pick one)

# Option A: requirements-dev.txt (simple)
pip install -r requirements-dev.txt
pip freeze > requirements.txt  # pin exact versions for production/dev parity

# Option B: Poetry (deterministic, modern)
curl -sSL https://install.python-poetry.org | python3 -
poetry init --no-interaction
poetry add --dev black isort flake8 pytest python-dotenv mypy
```

### Line-by-line explanation
- pyenv which python: Verifies the interpreter being used is the pyenv-selected one.
- python -m venv .venv and source .venv/bin/activate: Create and activate a dedicated venv for this project.
- Option A (requirements-dev.txt): Installs tooling and records exact versions in requirements.txt for deterministic installs in production/dev.
- Option B (Poetry): Installs Poetry, initializes a project, and adds the dev tooling as locked dependencies, ensuring reproducible installs via poetry.lock.

Notes:
- If you choose Poetry, you typically run a shell session via poetry shell or use poetry run to execute commands in the virtual environment.
- If you choose requirements.txt, you may later separate production vs development dependencies.

## 4. 4. Code Quality, Linting, and Type Checking

A robust backend codebase enforces style, detects issues early, and helps maintain long-term quality.

```toml
# pyproject.toml (example for Black and Isort configuration)
[tool.black]
line-length = 88
target-version = ["py311"]

[tool.isort]
profile = "black"

# Optional: static type checking preferences (mypy)
[mypy]
python_version = "3.11"
strict = true
```

```ini
# .flake8 (linting preferences)
[flake8]
max-line-length = 88
extend-ignore = E203, W503
exclude = .venv, tests, migrations
```

### Line-by-line explanation
- [tool.black] block configures Black to format code with a max line length and Python target.
- [tool.isort] block aligns import sorting with Black's style.
- [mypy] block (optional) enables stricter type checking; helps catch type-related issues early.
- .flake8 block configures the linter to enforce style while ignoring some line-break edge cases and excluding certain directories.

Optional commands to run:
```bash
# Run formatters and lints
black .
isort .
flake8 .
mypy app
```

## 5. 5. Pre-commit Hooks and Local Validation

Pre-commit hooks run automatically on commits to catch issues early (formatting, linting, type checks, etc.).

```yaml
# .pre-commit-config.yaml
repos:
- repo: https://github.com/psf/black
  rev: 23.7.0
  hooks:
  - id: black
- repo: https://github.com/PyCQA/isort
  rev: 5.12.0
  hooks:
  - id: isort
- repo: https://github.com/PyCQA/flake8
  rev: 6.0.0
  hooks:
  - id: flake8
- repo: https://github.com/pre-commit/mirrors-mypy
  rev: v0.991
  hooks:
  - id: mypy
```

```bash
# Install and activate pre-commit
pip install pre-commit
pre-commit install

# Run all checks on all files (initial)
pre-commit run --all-files
```

### Line-by-line explanation
- pre-commit-config.yaml lists a set of hooks (Black for formatting, isort for import order, Flake8 for linting, Mypy for static typing).
- pre-commit install wires the hooks to git so they run on commit.
- pre-commit run --all-files triggers the hooks on all repository files to bring everything to a clean baseline.

## 6. 6. Testing, Configuration, and CI

Tests validate behavior, configuration ensures environment correctness, and CI/CD automates these checks in the pipeline.

```python
# tests/test_math.py
def test_add():
    assert 1 + 1 == 2

def test_hello():
    from app.main import hello
    assert hello() == {"status": "ok"}
```

```ini
# pytest.ini (or pyproject.toml [tool.pytest] section)
[pytest]
minversion = "8.0"
addopts = "-ra -q"
testpaths = ["tests"]
```

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [ main ]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          python -m venv .venv
          source .venv/bin/activate
          pip install --upgrade pip
          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
          if [ -f requirements-dev.txt ]; then pip install -r requirements-dev.txt; fi
      - name: Run tests
        run: |
          source .venv/bin/activate
          pytest
```

### Line-by-line explanation
- tests/test_math.py includes basic unit tests and a functional import-based test to verify app behavior.
- pytest.ini configures pytest for discovery and reporting preferences.
- The GitHub Actions workflow demonstrates how to bootstrap a Python 3.11 environment, install dependencies, and run tests in CI, ensuring reproducibility across the team’s CI infrastructure.

## 7. 7. Environment Variables, Secrets, and Local Databases

Use environment variables for configuration, and dotenv for local development without committing secrets.

```python
# app/config.py
from dotenv import load_dotenv
import os

load_dotenv()  # loads from .env if present

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./local.db")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
```

```bash
# .env (do not commit this)
DATABASE_URL=postgresql://user:pass@localhost:5432/devdb
SECRET_KEY=super-secret-value
```

```text
# .env.example (safe to commit)
DATABASE_URL=postgresql://USER:PASS@HOST:PORT/DB
SECRET_KEY=REPLACE_WITH_SECRET
```

### Line-by-line explanation
- load_dotenv(): Reads environment variables from a .env file if present to configure the application locally.
- os.getenv(..., default): Retrieves environment values with defaults to prevent runtime errors if a key is missing.
- .env: Local secrets and configuration; never commit to VCS.
- .env.example: A template for team members to copy and fill with their own values.

## 8. 8. Local Development Database Setup (Docker Compose)

Running a real database locally is common in development; Docker Compose helps you run it consistently.

```yaml
# docker-compose.yml
version: "3.9"

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: devdb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  adminer:
    image: adminer
    ports:
      - "8080:8080"

volumes:
  pgdata:
```

```bash
# Start local DB
docker-compose up -d
```

### Line-by-line explanation
- db service uses Postgres 15 to provide a real database for development and testing.
- POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB define initial credentials and database name.
- Ports map container ports to host ports so you can connect from local apps (5432) and Adminer UI (8080).
- docker-compose up -d runs services in the background for fast local iteration.

## 9. 9. Local Server Run, Debugging, and Observability

Run a minimal Python backend server and demonstrate basic debugging and logging.

```python
# app/main.py (enhanced)
import logging
from fastapi import FastAPI
from dotenv import load_dotenv
import os

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./local.db")

@app.get("/")
def read_root():
    logger.info("Root endpoint hit; DATABASE_URL=%s", DATABASE_URL)
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
```

```bash
# Run locally with auto-reload (FastAPI + Uvicorn)
uvicorn app.main:app --reload
```

```python
# Simple in-process debugging example
def compute(x, y):
    import ipdb; ipdb.set_trace()  # debugging breakpoint
    return x + y
```

### Line-by-line explanation
- load_dotenv(): Reads environment variables from .env to configure the app locally.
- logging setup: Configures a simple logging pipeline for observability.
- DATABASE_URL: Reads the database URL (defaulting to a local SQLite file for convenience).
- read_root: Endpoint that logs activity and returns a stable payload; helps verify correct wiring and runtime config.
- uvicorn.run: Starts the server with auto-reload for development.
- ipdb.set_trace(): Demonstrates an inline debugging breakpoint for interactive inspection during development.

## 10. 10. Why This Matters In Real Systems

Building a professional dev environment is not just about ticking boxes; it’s about enabling safe, rapid, and scalable software delivery in production.

- Reproducibility: Pinning Python versions, exact dependency versions, and consistent OS-agnostic tooling minimizes “works on my machine” issues.
- Collaboration: Shared tooling (pre-commit, linting, tests) reduces style debates and integration issues across teams.
- Quality gates: Automated formatting, linting, typing, and tests catch regression risks before they reach production.
- Security: Secrets management and environment separation prevent leakage and accidental exposure of credentials.
- Deployability: A clean, well-documented setup makes it easier to replicate environments across staging and production, enabling smooth CI/CD pipelines.

## X. Common Beginner Mistakes

Three common pitfalls with bad vs good code/examples side-by-side.

- Pitfall 1: Mixing dev and prod dependencies
  - Bad:
    Python app code installs or uses dev-only packages in production by accident.
  - Good:
    Keep production dependencies separate; use requirements.txt for prod and requirements-dev.txt for dev, or use a tool like Poetry to separate dev vs prod.

Bad:
```bash
pip install -r requirements-dev.txt
# In production, this pulls tests/linting tools which aren't needed
```

Good:
```bash
# Production install
pip install -r requirements.txt

# Development install
pip install -r requirements-dev.txt
```

- Pitfall 2: Not using a virtual environment or version manager
  - Bad:
    Running installed system Python globally leads to version drift and conflicting packages.
  - Good:
    Use pyenv to pin versions and a venv for isolated environments.

Bad:
```bash
# Assume system Python and global site-packages
python -m pip install some-package
```

Good:
```bash
pyenv install 3.11.5
pyenv local 3.11.5
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

- Pitfall 3: Committing secrets or environment-specific config
  - Bad:
    Commit .env with credentials into git.
  - Good:
    Use a .env.example template and ignore real secrets; load them via dotenv at runtime.

Bad:
```bash
# .env contains real credentials
DATABASE_URL=postgresql://user:pass@host/db
```

Good:
```bash
# .env.example is committed; real .env is ignored
DATABASE_URL=postgresql://USER:PASS@HOST:PORT/DB
```

- Pitfall 4: Skipping tests or CI without clear signals
  - Bad:
    Rely on local ad-hoc checks and skip CI tests.
  - Good:
    Write unit tests, add pytest.ini, and wire CI like GitHub Actions to run tests automatically.

Bad:
```bash
# No tests or CI
```

Good:
```bash
# tests/test_basic.py
def test_true():
    assert True

# CI workflow runs pytest
```

## Y. Why This Matters In Real Systems — Recap

- Reproducibility and determinism are non-negotiable in production; your dev environment is the first line of defense against environment drift.
- Observability begins at development: logging, environment-aware configuration, and test suites reflect on-call realities.
- Secure defaults and separation of concerns (secrets vs code) prevent incidents and data leaks.
- A predictable, well-documented workflow accelerates onboarding and reduces mean time to recovery when incidents occur.

## Z. Study Questions

1) What are the advantages of pinning Python versions per-project, and how does pyenv help achieve this?
2) Why should you separate production dependencies from development tooling, and what are common strategies to do so?
3) How does a pre-commit workflow improve code quality before it reaches CI?
4) What is the purpose of a .env file, and how should you manage secrets in a real project?
5) Describe a minimal Docker Compose setup you would use for local development with a database and an admin UI.

## Exercise

Complete the following multi-part task to reinforce the concepts from this lesson.

Part A: Project scaffold and tooling
- Create a new Python project named backend-challenge with the following:
  - A package app containing main.py with a simple FastAPI app exposing a root endpoint that returns {"status": "ready"}.
  - A lightweight test at tests/test_main.py that asserts the root endpoint returns the expected payload.
  - A .env.example template and a .env file in .gitignore-safe form (do not commit real secrets).
  - A pyproject.toml and/or requirements-dev.txt containing at least Black, isort, and pytest.

Part B: Virtual environment and version control
- Use pyenv to pin Python 3.11.5 locally and create a virtual environment for the project.
- Install dependencies described in Part A and ensure the environment is reproducible on another machine (describe the commands you would give to a teammate).

Part C: Code quality and pre-commit
- Add a .pre-commit-config.yaml with hooks for Black, Isort, Flake8, and MyPy.
- Install and run pre-commit on all files. Ensure that formatting and lint checks pass.

Part D: Environment management and local DB
- Add a docker-compose.yml with a Postgres service and an adminer service for local development.
- Show how the app would connect to the Postgres DB via an environment variable (DB_URL) loaded using python-dotenv.

Part E: CI and a basic run script
- Create a GitHub Actions workflow that runs pytest in a Python 3.11 environment.
- Add a small run script (scripts/run_dev.sh) that activates the venv, exports env vars, and starts the FastAPI server with uvicorn in reload mode.

Deliverables:
- A minimal, working repository skeleton that satisfies Part A–E.
- Brief notes on how you would run, test, and verify the workflow on a teammate’s machine.

End of lesson.