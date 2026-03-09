# Environment Variables & Config Management in Node.js

Environment variables and configuration management are foundational for deploying reliable, scalable backend services. They let you tailor behavior per environment (dev, test, staging, prod) without changing code, rotate secrets safely, and keep sensitive data out of your source tree. In Node.js, you’ll typically read config from process.env, apply defaults, validate inputs, and employ patterns that scale with teams and deployments. This lesson walks through practical patterns, concrete code, and production-aware considerations.

## 1. Understanding Environment Variables in Node.js

Environment variables are the main source of dynamic configuration at runtime. Node.js exposes them on process.env. A robust app uses defaults, validates critical values, and avoids leaking secrets through logs or UI.

```js
// 1. Quick peek at environment variables in a Node.js app
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';
const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/app';

console.log(`Starting app on ${host}:${port}`);
console.log(`Using database: ${databaseUrl}`);
```

### Line-by-line explanation breaking down each line
- Line 1: Reads the PORT environment variable; if not set, defaults to 3000.
- Line 2: Reads HOST from environment; defaults to 0.0.0.0 to listen on all interfaces.
- Line 3: Reads DATABASE_URL; defaults to a local Postgres URL if not provided.
- Line 5: Logs the chosen host/port for observability.
- Line 6: Logs the database URL being used; in real systems, avoid logging full URLs with credentials.

---

## 2. Building a Robust Config Module (Defaults + Env Vars)

A dedicated config module centralizes defaults, environment overrides, and type handling. This helps keep startup-time behavior predictable and testable.

```js
// 2. config.js - robust defaults + env var overrides
const DEFAULTS = {
  port: 3000,
  host: '0.0.0.0',
  databaseUrl: 'postgresql://localhost:5432/app',
  logLevel: 'info',
  jwtSecret: 'CHANGE_ME_PLEASE'
};

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

function loadConfig() {
  return {
    port: toInt(process.env.PORT, DEFAULTS.port),
    host: process.env.HOST || DEFAULTS.host,
    databaseUrl: process.env.DATABASE_URL || DEFAULTS.databaseUrl,
    logLevel: process.env.LOG_LEVEL || DEFAULTS.logLevel,
    jwtSecret: process.env.JWT_SECRET || DEFAULTS.jwtSecret,
  };
}

module.exports = { loadConfig };
```

```js
// 2. app.js - using the config module to start a server
const { loadConfig } = require('./config');
const config = loadConfig();

const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Hello from the config-enabled app!'));

app.listen(config.port, config.host, () => {
  console.log(`Server listening on http://${config.host}:${config.port}`);
});
```

### Line-by-line explanation breaking down each line (config.js)
- Line 1-6: Define a DEFAULTS object to hold sane defaults for port, host, database URL, log level, and a placeholder JWT secret.
- Line 8-11: toInt converts a string value to an integer; falls back to the provided default if parsing fails.
- Line 13-22: loadConfig assembles a config object by reading environment variables with fallbacks to DEFAULTS.
- Line 24: Exports the loadConfig function for consumption by the app.

### Line-by-line explanation breaking down each line (app.js)
- Line 1: Import the config loader.
- Line 2: Load the runtime config.
- Line 4-6: Create an Express app and define a simple route.
- Line 8-11: Start the server using values from the config.
- Line 12-13: Log a startup message confirming the bound host/port.

---

## 3. Loading Environment-Specific Config with dotenv

For local development, dotenv is a simple, widely-used way to supply environment variables without editing your shell or CI pipelines. In production, you should rely on real env vars provided by the hosting environment.

```js
// 3a. dev-setup.js - load dotenv in non-production environments
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
```

```env
# 3b. .env (example for development)
PORT=4000
HOST=127.0.0.1
DATABASE_URL=postgresql://localhost:5432/devdb
JWT_SECRET=supersecretdev
LOG_LEVEL=debug
```

### Line-by-line explanation breaking down each line (dev-setup.js)
- Line 2: Checks if the environment is not production.
- Line 3: If not production, loads variables from a .env file into process.env using dotenv.

### Line-by-line explanation breaking down each line (.env)
- Line 1: PORT is set to 4000 for local dev.
- Line 2: HOST is 127.0.0.1 for local binding.
- Line 3: DATABASE_URL points to a local dev database.
- Line 4: JWT_SECRET is a dev secret (do not use this in prod).
- Line 5: LOG_LEVEL is set to debug for verbose logs during development.

Notes:
- Do not commit real secrets to version control. Use .env.sample to document required keys without values.
- In production, rely on the hosting environment’s secret management mechanism and actual environment variables.

---

## 4. Validation and Safety: Ensuring Required Vars

Validating config at startup prevents misconfiguration and hard-to-debug outages. Joi (or similar) helps enforce types, presence, and allowed values.

```js
// 4. config/validate.js - validate critical config at startup
const Joi = require('joi');

const configSchema = Joi.object({
  port: Joi.number().integer().min(1).max(65535).default(3000),
  host: Joi.string().ip({ cidr: 'forbid' }).default('0.0.0.0'),
  databaseUrl: Joi.string().uri().required(),
  jwtSecret: Joi.string().min(32).required(),
  logLevel: Joi.string().valid('error', 'warn', 'info', 'debug').default('info')
});

function loadAndValidateConfig() {
  const env = {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    logLevel: process.env.LOG_LEVEL || 'info'
  };

  const { error, value } = configSchema.validate(env, { abortEarly: false });
  if (error) {
    throw new Error('Invalid configuration: ' + error.details.map(d => d.message).join(', '));
  }
  return value;
}

module.exports = { loadAndValidateConfig };
```

```js
// 4b. server-validated.js - using validated config to start
const { loadAndValidateConfig } = require('./config/validate');
const config = loadAndValidateConfig();

const express = require('express');
const app = express();

app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

app.listen(config.port, config.host, () => {
  console.log(`Server (validated) listening on http://${config.host}:${config.port}`);
});
```

### Line-by-line explanation breaking down each line (validate.js)
- Line 3-9: Define a Joi schema that enforces types, ranges, and required fields.
- Line 11-20: Build an env object from process.env with defaults.
- Line 22-25: Validate env against the schema; if errors exist, throw a descriptive error at startup.
- Line 26-27: Export the validated config loader.

### Line-by-line explanation breaking down each line (server-validated.js)
- Line 1-2: Import and run the validation to obtain a safe config object.
- Line 4-7: Create a basic Express app and a health endpoint for readiness checks.
- Line 9-12: Start the server and log the startup information.

---

## 5. Why This Matters In Real Systems

- 12-Factor alignment: Treat config as separate from code, via environment variables with explicit defaults.
- Separation of concerns: Centralized config management simplifies testing, deployment, and scaling.
- Secrets hygiene: Never log secrets; mask sensitive values in logs and dashboards.
- Validation at startup: Catch misconfig before serving traffic, reducing runtime failures and outages.
- Deployment flexibility: Different environments can have distinct settings (ports, DB endpoints, log levels) without code changes.
- Observability: Expose a health endpoint and a config view that sanitized for operators to diagnose issues without leaking credentials.

Example of safe runtime behavior (conceptual):
- Read a config object from loadConfig() or validatedConfig().
- Use a redacted view for operational dashboards:
  - Show port/host/db endpoint in abstracted form (e.g., redact credentials in URIs).
  - Do not reveal JWT secrets or database passwords in logs or responses.
- If a required var is missing or invalid, fail fast during startup with a clear error message.

```js
// 5. server-safe-boot.js - example of redacting secrets before logging
function maskSecrets(cfg) {
  const safe = { ...cfg };
  if (safe.jwtSecret) safe.jwtSecret = '*****';
  if (safe.databaseUrl) {
    // redact credentials inside the URL, e.g., postgres://user:pass@host/db
    safe.databaseUrl = safe.databaseUrl.replace(/:\/\/([^@]+)@/, '://*****@');
  }
  return safe;
}

const config = require('./config/validate').loadAndValidateConfig();
console.log('Boot config:', maskSecrets(config));
// Proceed to start the server with the validated config
```

---

## 6. Study Questions

1. What is the primary purpose of environment variables in 12-factor Node.js apps?  
2. How do you provide sensible defaults for config values that might be missing in a given environment?  
3. Why is it important to validate configuration at startup, and which tool is demonstrated here for validation?  
4. What are best practices for handling secrets in configuration (e.g., JWT_SECRET, database passwords) in logs and dashboards?  
5. How would you adapt the configuration loading approach when your app runs in multiple environments (dev, test, prod) with CI/CD pipelines?

---

## 7. Exercise

Part A: Create a small Node.js backend that uses environment-based config with defaults and dotenv in development.

- Deliverables:
  - A config module that:
    - Reads PORT, HOST, DATABASE_URL, JWT_SECRET, LOG_LEVEL from env with defaults.
    - Optionally loads .env in non-production environments.
  - A simple Express server that:
    - Exposes /health returning { status: 'ok' }.
    - Exposes /config returning a sanitized view of the current config (no secrets).
  - Config validation at startup using Joi (or equivalent) to ensure required vars exist and types are correct.
  - Logging of startup with secrets masked.
  - A .env.example file documenting required keys (no real secrets).

Part B: Run and verify locally.

- Steps:
  1. Initialize a new project and install dependencies: express, joi, dotenv.
  2. Create the structure:
     - src/config.js (or src/config/index.js)
     - src/server.js (or src/app.js)
     - .env.example
  3. Start in development mode with dotenv:
     - Copy .env.example to .env and fill in appropriate values.
     - NODE_ENV=development node src/server.js (or npm run dev if you add a script).
  4. Validate that:
     - The server starts with the configured port and host.
     - /health returns a 200 OK.
     - /config returns a sanitized view (jwtSecret and database credentials masked).

Starter code snippets for reference (to copy into your project):

- src/config.js
```js
const DEFAULTS = {
  port: 3000,
  host: '0.0.0.0',
  databaseUrl: 'postgresql://localhost:5432/app',
  logLevel: 'info',
  jwtSecret: 'CHANGE_ME_PLEASE'
};

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

function loadConfig() {
  return {
    port: toInt(process.env.PORT, DEFAULTS.port),
    host: process.env.HOST || DEFAULTS.host,
    databaseUrl: process.env.DATABASE_URL || DEFAULTS.databaseUrl,
    logLevel: process.env.LOG_LEVEL || DEFAULTS.logLevel,
    jwtSecret: process.env.JWT_SECRET || DEFAULTS.jwtSecret,
  };
}

module.exports = { loadConfig };
```

- src/server.js
```js
const { loadConfig } = require('./config');
const config = loadConfig();

const express = require('express');
const app = express();

function maskSecrets(cfg) {
  const safe = { ...cfg };
  if (safe.jwtSecret) safe.jwtSecret = '*****';
  if (safe.databaseUrl) {
    safe.databaseUrl = safe.databaseUrl.replace(/:\/\/([^@]+)@/, '://*****@');
  }
  return safe;
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/config', (req, res) => {
  res.json(maskSecrets(config));
});

app.listen(config.port, config.host, () => {
  console.log(`Server listening on http://${config.host}:${config.port}`);
});
```

- .env.example
```env
# .env.example - copy to .env and fill values for development
PORT=
HOST=
DATABASE_URL=
JWT_SECRET=
LOG_LEVEL=
```

- package.json (optional)
```json
{
  "name": "config-demo",
  "version": "1.0.0",
  "scripts": {
    "dev": "NODE_ENV=development node src/server.js"
  },
  "dependencies": {
    "dotenv": "^16.0.0",
    "express": "^4.18.0",
    "joi": "^17.6.0"
  }
}
```

This lesson provides a practical, production-focused approach to environment variables and config management in Node.js. It emphasizes defaults, development-time conveniences, startup-time validation, and safe exposure of config for operators without leaking secrets. If you want, I can tailor the exercise to a specific framework (e.g., Koa, Fastify) or integration (e.g., AWS Secrets Manager, Vault) for your cohort.