# Setting Up a Professional Dev Environment for Node.js

A professional development environment for Node.js is more than just writing code. It includes reproducible Node.js versions, automated testing, consistent styling, reliable linting, secure handling of configuration, efficient local development workflows, and predictable builds for production. Building this foundation helps teams onboard faster, reduces "it works on my machine" issues, and enables safer deployments at scale.

## 1. Project Skeleton and Package Management

This section establishes a reproducible baseline: pin the Node.js version, define scripts for dev/prod, set up lint/formatting, and create a minimal Express app scaffold. It also includes environment configuration patterns and a minimal Git ignore strategy.

### 1.1 Node version pinning and basic scaffold files

```text
.nvmrc
# Node version to use for this project
18.16.0
```

```json
// package.json
{
  "name": "backend-dev-env",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon -w src --ext js,json src/index.js",
    "lint": "eslint .",
    "format": "prettier --write .",
    "test": "echo 'No tests yet'"
  },
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22",
    "eslint": "^8.54.0",
    "prettier": "^2.8.8",
    "husky": "^8.0.0",
    "lint-staged": "^12.0.0",
    "pino": "^7.8.0"
  },
  "lint-staged": {
    "*.js": ["eslint --fix", "git add"]
  }
}
```

```text
.gitignore
node_modules/
.env
.env.*.local
.env.local
dist/
build/
coverage/
*.log
```

```text
.env.example
PORT=3000
NODE_ENV=development
```

```js
// src/index.js
const express = require('express');
const app = express();

// Load env vars in non-production environments
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/', (req, res) => {
  res.send('Hello from Node.js dev environment');
});

app.use((err, req, res, next) => {
  // Simple global error handler
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}
```

### 1.1 Line-by-line explanation

- .nvmrc: Declares the Node.js version to use for this project; tooling can pick up this version to ensure consistency.
- package.json: Defines project metadata, dependencies, devDependencies, and npm scripts for start, dev, lint, format, and tests.
- .gitignore: Prevents node_modules, environment files, and build artifacts from being committed.
- .env.example: Provides a template for developers to copy to .env and customize with project-specific values without committing secrets.
- src/index.js: 
  - Requires Express and creates an app instance.
  - Conditionally loads environment variables via dotenv when not in production.
  - Applies JSON parsing middleware.
  - Sets the listening port from ENV or defaults to 3000.
  - Defines a /health route returning a simple status payload.
  - Defines a root route with a friendly message.
  - Sets up a basic error-handling middleware to respond with a 500 on errors.
  - Exports the app for testing or other entry points.
  - If run directly, starts the server and logs the port.

---

## 2. Local Development Workflow and Environment Variables

A professional dev workflow uses hot-reloading for dev, structured logging, and a clear separation between code and configuration. This section introduces a lightweight logger, dotenv usage, and helpful dev scripts.

### 2.1 Lightweight structured logger and usage in app

```js
// src/logger.js
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  prettyPrint: process.env.NODE_ENV !== 'production',
  name: 'backend-dev-env'
});

module.exports = logger;
```

### 2.1 Line-by-line explanation

- Require the Pino library to create a fast, structured logger.
- Create a logger instance with:
  - level taken from LOG_LEVEL env var or default to 'info'.
  - prettyPrint enabled during development to improve readability.
  - a service name of 'backend-dev-env' for log tagging.
- Export the logger for use across the app.

---

### 2.2 Integrating logger into request flow

```js
// src/index.js (excerpt)
const express = require('express');
const app = express();
const logger = require('./logger');

// existing middleware...
app.use(express.json());

app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.originalUrl }, 'incoming request');
  next();
});
```

### 2.2 Line-by-line explanation

- Import the centralized logger and attach a middleware to log each incoming request method and URL with a timestamp-like message.
- Continues to call next() to ensure the request lifecycle proceeds.

---

### 2.3 Error handling and a dedicated error middleware

```js
// src/index.js (excerpt)
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);
```

```js
// src/middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
}
module.exports = errorHandler;
```

### 2.3 Line-by-line explanation

- Import the centralized error handler and mount it after routes to catch thrown errors.
- errorHandler.js:
  - Extracts a status (default 500) and message (default 'Internal Server Error').
  - Sends a JSON response with the error payload.
  - Exports the middleware for use in the main app.

---

### 2.4 Environment variable strategy and example

```text
.env
PORT=3000
LOG_LEVEL=debug
```

```text
.env.sample
PORT=3000
LOG_LEVEL=info
```

### 2.4 Line-by-line explanation

- .env: Local development overrides for PORT and LOG_LEVEL.
- .env.sample: A template for new contributors to see which variables exist without exposing secrets.
- This pattern helps avoid hard-coding configuration in source code and supports different deployments.

---

### 2.5 Development workflow commands

```bash
# Install dependencies
npm install

# Start in development with hot-reload
npm run dev

# Run lint and auto-fix
npm run lint

# Format code according to Prettier rules
npm run format
```

### 2.5 Line-by-line explanation

- npm install installs both dependencies and devDependencies.
- npm run dev uses nodemon to restart on code changes for faster iteration.
- npm run lint runs ESLint to catch code quality issues.
- npm run format applies Prettier formatting to codebase.

---

## 3. Version Control, Testing, and Quality Assurance

A robust dev environment coordinates code quality and collaboration, including pre-commit checks, consistent linting, and clear Git hygiene.

### 3.1 Git hooks and lint-staged

```json
// package.json (additions)
"husky": "^8.0.0",
"lint-staged": "^12.0.0",
"scripts": {
  "prepare": "husky install",
  "start": "node src/index.js",
  "dev": "nodemon -w src --ext js,json src/index.js",
  "lint": "eslint .",
  "format": "prettier --write .",
  "test": "echo 'No tests yet'"
},
"lint-staged": {
  "*.js": ["eslint --fix", "git add"]
}
```

```bash
# Initialize Husky (first-time)
npx husky install

# Create a pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"
```

### 3.1 Line-by-line explanation

- Add Husky and lint-staged as dev dependencies and wire up scripts:
  - prepare runs on install to enable Husky hooks.
  - lint-staged config runs ESLint on staged JavaScript files before commit.
- The pre-commit hook runs lint-staged on every commit to auto-fix and stage changes, ensuring only lint-clean code is committed.
- The combination helps prevent common style and quality regressions from entering the repository.

---

### 3.2 Example pre-commit hook content (for Husky v7+)

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

### 3.2 Line-by-line explanation

- Standard Husky pre-commit shell script.
- Invokes lint-staged to process staged files, applying fixes and re-staging.

---

### 3.3 Minimal CI prerequisites (optional)

```yaml
# .github/workflows/nodejs.yml
name: Node.js CI

on:
  push:
    branches: [ main, master ]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run lint --if-present
      - run: npm test --if-present
```

### 3.3 Line-by-line explanation

- Defines a GitHub Actions workflow triggered on push or PRs.
- Uses Node.js 18.x to align with the project Node version.
- Checks out code, installs dependencies with npm ci (clean install using package-lock.json), lints, and runs tests if present.
- Encourages reproducible builds in CI.

---

## 4. Debugging, Observability, and Performance Basics

Observability reduces mean time to recovery and helps diagnose issues in production. This section covers structured logging, error handling improvements, and a basic debug workflow.

### 4.1 Production-ready logging with Pino

```js
// src/logger.js (already shown above)
const pino = require('pino');
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  prettyPrint: process.env.NODE_ENV !== 'production',
  name: 'backend-dev-env'
});
module.exports = logger;
```

### 4.1 Line-by-line explanation

- See Section 2.1 for the detailed breakdown. This logger is centralized and can be easily extended to write to files or external logging systems in production.

---

### 4.2 Debugging with Node’s inspector

```json
// package.json
"scripts": {
  "start": "node src/index.js",
  "dev": "nodemon -w src --ext js,json src/index.js",
  "debug": "node --inspect-brk=0.0.0.0:9229 src/index.js"
}
```

### 4.2 Line-by-line explanation

- The debug script runs Node in inspector mode, waiting for a debugger to attach on port 9229.
- This is valuable for remote debugging or attaching a debugger from an IDE during development.

---

### 4.3 Simple error propagation pattern

```js
// src/index.js (excerpt)
app.use((req, res, next) => {
  try {
    // route handling logic...
    next();
  } catch (err) {
    next(err);
  }
});
```

### 4.3 Line-by-line explanation

- Wrap route logic to forward errors to Express’ error handler using next(err).
- Helps ensure consistent error handling and logging, especially when using async routes.

---

## 5. Deployment Prep and Reproducibility

A professional environment includes deployment-ready artifacts and reproducible builds, including containerization and CI/CD considerations.

### 5.1 Dockerfile for reproducible builds

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000
CMD ["node", "src/index.js"]
```

### 5.1 Line-by-line explanation

- Uses Node.js 18 on Alpine for a small, secure image.
- Creates work directory, installs dependencies with npm ci (clean install using lockfile), copies source, exposes port, and starts the app.

---

### 5.2 docker-compose for local dev

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
```

### 5.2 Line-by-line explanation

- Defines a single service named app built from the current directory.
- Maps container port 3000 to host port 3000.
- Loads environment variables from .env for local configuration, centralizing secrets away from source.

---

### 5.3 Docker ignore and production parity tips

```text
# .dockerignore
node_modules
npm-debug.log
Dockerfile
.dockerignore
.env
.env.*.local
```

### 5.3 Line-by-line explanation

- Excludes large or sensitive files from the Docker image to keep builds lean and secure.

---

### 5.4 Minimal CI for Docker builds (example)

```yaml
# .github/workflows/docker.yml
name: Dockerized Node.js app

on:
  push:
    branches: [ main, master ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Build Docker image
        run: docker build -t backend-dev-env .
```

### 5.4 Line-by-line explanation

- Demonstrates building and pushing a Dockerized image in CI, enabling reproducible production-like builds in automation.

---

## X. Common Beginner Mistakes

3+ real pitfalls with bad vs good code side-by-side.

| Bad | Good |
|---|---|
| Bad: Node version not pinned or inconsistent across machines. | Good: Pin Node version with .nvmrc and document it. | 
|```text
// No version pinning
node -v
``` | 
|```text
.nvmrc
18.16.0
``` |
| Secret management inside source code. | Load secrets via environment/config management; do not commit secrets. |
|```js
// SECRET = 'supersecret' hard-coded
const SECRET = 'supersecret';
``` | 
|```js
// SECRET read from environment
const SECRET = process.env.SECRET || '';
``` |
| Running dev with ad-hoc scripts only, no lint/format. | Use scripts and pre-commit hooks for consistency. |
|```bash
# Frequent manual linting
eslint src && prettier --write .
``` | 
|```json
// package.json
"lint": "eslint .",
"format": "prettier --write .",
"prepare": "husky install"
``` |
| No separation of concerns for config vs code. | Use a .env/.env.example pattern and a config module to read settings. |
|```js
// config.js
const PORT = process.env.PORT || 3000;
module.exports = { PORT };
``` | 
|```js
// config.js (improved)
require('dotenv').config();
module.exports = {
  PORT: process.env.PORT || 3000,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};
``` |

### 2-line explanations

- Pinning Node version prevents drift across machines and CI, ensuring consistent behavior.
- Do not embed secrets in code; use environment variables and secrets management to reduce leak risk.
- Establish a disciplined dev workflow with lint/format and pre-commit checks to catch issues early.
- Separate config from code to allow different environments (dev, test, prod) without changing source files.

---

## Y. Why This Matters In Real Systems

- Reproducibility: A pinned Node version and consistent tooling ensure developers, CI, and production behave the same.
- Faster onboarding: A clear scaffold with scripts, linting, and hooks reduces ramp-up time for new engineers.
- Safer deployments: Centralized logging, error handling, and environment separation improve reliability and debuggability in production.
- Collaboration at scale: Pre-commit hooks and CI pipelines enforce code quality without relying on every engineer remembering a checklist.
- Security and secrets management: Avoids hard-coded credentials and reduces risk from leaked secrets.

Real systems rely on predictable environments and automated checks to minimize drift and outages. When a developer can clone the repo, run npm install, and immediately have a working dev server with consistent linting, formatting, and testing, the team spends less time on setup and more on delivering value.

---

## Z. Study Questions

1) What file pins the Node.js version for this project, and how is it used?  
2) What is the purpose of lint-staged in a pre-commit workflow?  
3) How should environment variables be loaded differently in development vs production?  
4) Why is a Dockerfile commonly included in a professional backend dev environment?  
5) What are the benefits of having a centralized logger like Pino in an Express app?

---

## Exercise

You're building a small Node.js backend project and want to apply all best practices from this lesson. Complete the following multi-part task.

Part A — Scaffold
- Initialize a new Node.js project and pin Node version.
- Create a minimal Express server with a /health endpoint.
- Add a .env.example and a .env.sample (do not commit actual secrets).

Part B — Tooling and Scripts
- Add ESLint and Prettier configurations and ensure they can auto-fix.
- Add a dev script using nodemon for hot-reload.
- Add a start script for production-like running.

Part C — Quality Gate
- Set up Husky and lint-staged so that on each commit JavaScript files are linted and fixed if possible.
- Add a basic Git ignore for Node modules and environment files.

Part D — Environment and Debugging
- Create a logger module using Pino and integrate it into the app to log incoming requests.
- Add a debug script that starts Node with --inspect-brk.

Part E — Containerization (optional but recommended)
- Write a Dockerfile suitable for running the app in a container.
- Provide a docker-compose.yml to run the app with an .env file.

Part F — Validation
- Run npm install, npm run dev, and ensure the /health endpoint returns a JSON response.
- Attempt a git commit and verify that lint-staged runs and fixes the code if needed.
- Run npm run lint and npm run format to validate the workflow.

Starter files you should create or modify:
- .nvmrc (18.x or 18.16.0)
- .gitignore
- package.json (with scripts, dependencies, devDependencies, lint-staged)
- .eslintrc.cjs (or .eslintrc.json)
- .prettierrc.json
- .editorconfig
- .env.example
- .env (not committed)
- src/index.js (Express app with /health)
- src/logger.js (Pino-based logger)
- src/middleware/errorHandler.js
- .husky/pre-commit (or rely on Husky v8 standard)
- docker/Dockerfile and docker-compose.yml (optional)
- .github/workflows/nodejs.yml (optional)

If you complete this exercise, you will have a robust, production-friendly Node.js development environment that supports fast iteration, predictable builds, and safer collaboration.