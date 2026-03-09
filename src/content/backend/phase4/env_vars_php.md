# Track: Backend Engineering — Phase 4 — Building Web Servers — Environment Variables & Config Management (PHP)

Environment variables and centralized configuration are foundational for reliable, portable, and secure backend systems. In PHP applications, config should live outside the codebase, vary by environment, and keep secrets out of source control. This lesson shows practical patterns to load and use environment variables, publish best practices for secrets management, and structure config for maintainable, testable code in real-world deployments.

## 1. Understanding Why Environment Variables Matter in PHP

Environment variables provide a simple, secure way to inject configuration without changing code. They support:
- Separation of code and environment-specific settings (dev, test, prod)
- Safe handling of credentials and secrets
- Consistent configuration across processes, containers, and servers
- Better adherence to the 12-factor app methodology

Code example shows a minimal way to build a config array by merging defaults with environment-driven values.

```php
<?php
// config.php
$defaults = [
    'db' => [
        'host'     => '127.0.0.1',
        'port'     => 3306,
        'name'     => 'app_db',
        'user'     => 'root',
        'password' => ''
    ],
    'app' => [
        'debug' => false
    ]
];

// Load environment values (from actual env vars)
$dbHost     = getenv('DB_HOST');
$dbPort     = getenv('DB_PORT');
$dbName     = getenv('DB_NAME');
$dbUser     = getenv('DB_USER');
$dbPassword = getenv('DB_PASSWORD');
$appDebug   = getenv('APP_DEBUG');

// Build an env-override configuration
$envConfig = [
    'db' => [
        'host'     => $dbHost ?? $defaults['db']['host'],
        'port'     => ($dbPort !== false && $dbPort !== null) ? (int)$dbPort : $defaults['db']['port'],
        'name'     => $dbName ?? $defaults['db']['name'],
        'user'     => $dbUser ?? $defaults['db']['user'],
        'password' => $dbPassword ?? $defaults['db']['password'],
    ],
    'app' => [
        'debug' => filter_var($appDebug ?? 'false', FILTER_VALIDATE_BOOLEAN)
    ]
];

$config = array_replace_recursive($defaults, $envConfig);
return $config;
```

### Line-by-line explanation
- Line 1: PHP opening tag to start a script.
- Line 3-13: Define a $defaults array with sensible values for database and app settings.
- Line 16-20: Read environment variables using getenv for each config key.
- Line 23: Construct $envConfig by combining env vars with defaults. If an env var is not set, the default persists.
- Line 29: Merge the defaults with the environment-driven config to produce the final $config.
- Line 30: Return the final config array for use elsewhere in the app.

## 2. Loading Environment Variables in PHP (Core Methods)

There are multiple ways to access environment variables in PHP. The most robust approach in modern apps is to use a dotenv library to load a .env file during development and yet rely on real environment variables in production.

Key topics:
- getenv() vs $_ENV vs $_SERVER
- Using vlucas/phpdotenv to load .env files
- Safe defaults and type casting

Code example: loading with phpdotenv and reading values

```php
<?php
// bootstrap.php
require __DIR__ . '/vendor/autoload.php';

// Load .env in development or local environments
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Prefer explicit reads (with defaults)
$dbHost = $_ENV['DB_HOST'] ?? '127.0.0.1';
$dbPort = isset($_ENV['DB_PORT']) ? (int)$_ENV['DB_PORT'] : 3306;
$appDebug = filter_var($_ENV['APP_DEBUG'] ?? 'false', FILTER_VALIDATE_BOOLEAN);

$config = [
    'db' => [
        'host' => $dbHost,
        'port' => $dbPort,
        'name' => $_ENV['DB_NAME'] ?? 'app_db',
        'user' => $_ENV['DB_USER'] ?? 'root',
        'password' => $_ENV['DB_PASSWORD'] ?? '',
    ],
    'app' => [
        'debug' => $appDebug
    ]
];

return $config;
```

### Line-by-line explanation
- Line 3: Load Composer autoloader to access dependencies (phpdotenv).
- Line 6-7: Create a Dotenv instance pointing to project root and load environment variables from .env (if present).
- Line 10-13: Read environment variables with safe fallbacks. Cast numeric values where appropriate.
- Line 15-24: Build a $config array from env vars with defaults, including app debug flag.
- Line 26: Return the final config.

Alternative minimal approach (without dotenv) using only native PHP variables:
```php
<?php
$host = getenv('DB_HOST') ?: '127.0.0.1';
$port = (int)(getenv('DB_PORT') ?: '3306');
```
Line-by-line explanation is similar: getenv fetches, and the ?: operator provides a fallback.

## 3. Secrets Management and Security Best Practices

Environment variables should never be exposed in source control or logs. Use secure secret management practices to protect credentials.

Bad vs Good practices (side-by-side)

```php
// Bad: Logging sensitive information
error_log("DB_PASSWORD=" . $_ENV['DB_PASSWORD']);

// Good: Never log secrets; log only non-sensitive context
error_log("DB_HOST=" . $_ENV['DB_HOST']);
```

Docker/Kubernetes patterns:
```yaml
# docker-compose.yml (example)
version: '3.8'
services:
  app:
    build: .
    env_file: .env
```

```yaml
# Kubernetes secret manifest (base64-encoded values)
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  DB_PASSWORD: c2VjcmV0LXZhbHVlCg==  # base64-encoded password
```

```yaml
# Pod/Deployment snippet using the secret
envFrom:
- secretRef:
    name: app-secrets
```

Notes:
- Prefer pulling secrets from a managed secret store (Kubernetes Secrets, AWS Secrets Manager, Vault) rather than hard-coding.
- Avoid exposing secrets in error messages, debug output, or exception traces.
- Rotate secrets and minimize their blast radius by scoping them to the smallest set of processes.

## 4. Configuration Loading Patterns: Defaults, Overrides, and Accessors

A robust approach uses layered configuration: defaults, environment overrides, and runtime overrides. Provide a simple accessor to retrieve nested values safely.

Code example: layered config with a small helper to read nested keys

```php
<?php
$defaults = [
    'db' => [
        'type' => 'mysql',
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'app_db',
        'user' => 'root',
        'password' => ''
    ],
    'cache' => [
        'enabled' => true,
        'ttl' => 300
    ]
];

// Runtime/env overrides
$overrides = [
    'db' => [
        'host' => $_ENV['DB_HOST'] ?? null,
        'password' => $_ENV['DB_PASSWORD'] ?? null,
    ],
    'cache' => [
        'ttl' => isset($_ENV['CACHE_TTL']) ? (int)$_ENV['CACHE_TTL'] : null
    ]
];

// Merge with environment overrides taking precedence
$config = array_replace_recursive($defaults, array_filter($overrides, function($v) {
    return !is_null($v);
}));

/**
 * Simple helper to access nested config with "dot" notation
 */
function cfgGet(array $config, string $path, $default = null) {
    $parts = explode('.', $path);
    $node = $config;
    foreach ($parts as $p) {
        if (!is_array($node) || !array_key_exists($p, $node)) return $default;
        $node = $node[$p];
    }
    return $node;
}

// Usage:
$dbHost = cfgGet($config, 'db.host', '127.0.0.1');
```

### Line-by-line explanation
- Line 3-13: Define default configuration values for database and caching.
- Line 16-25: Build an $overrides array from environment variables; only include if present.
- Line 28-32: Merge defaults with overrides, ensuring we don’t override with nulls.
- Line 35-44: Define a helper function cfgGet that reads nested values using dot notation, returning a default if the path isn’t found.
- Line 47-49: Example usage of cfgGet to fetch a nested value safely.

Benefits:
- Clear separation of defaults vs environment-driven values.
- Simple, readable access pattern to nested config.
- Easy to unit test by injecting a mock $config array.

## 5. Why This Matters In Real Systems (Production Context)

- Deployment Parity: Use env vars to keep development, staging, and production configurations aligned in behavior but separate in data.
- Containers and Orchestration: Docker and Kubernetes are designed to pass configuration through environment vars or secrets; PHP apps benefit from predictable config loading patterns.
- Secrets Lifecycle: Centralized secret management (rotation, access auditing) reduces risk of credential leaks.
- Performance and Reliability: Load env values once during bootstrap and cache in a Config class, rather than re-reading environment vars repeatedly per request in high-traffic apps.
- Environment-specific Tuning: For example, toggling APP_DEBUG off in prod to avoid verbose logs and potential information leakage, while enabling it in development for troubleshooting.

Production-minded PHP snippets:
- Docker Compose env_file usage to feed .env into containers.
- Kubernetes Secrets combined with envFrom to mount secrets into containers.
- A PHP bootstrap that loads .env in development and uses real OS env vars in production via the container/orchestrator.

Example: lightweight bootstrap for a typical PHP app
```php
<?php
// bootstrap.php
$config = require __DIR__ . '/config.php'; // final config

// Simple example usage:
if ($config['app']['debug']) {
    ini_set('display_errors', '1');
} else {
    ini_set('display_errors', '0');
}
```

Note: In production, ensure error handling never leaks sensitive information to end users.

## 6. Study Questions

1) Why should credentials be loaded from environment variables rather than being hard-coded in source files?  
2) What are the two common ways to access environment variables in PHP, and what are their trade-offs?  
3) How does a dotenv library help during development, and why might you avoid relying on it in production?  
4) What practices help prevent leaking secrets through logs or error messages?  
5) Describe a simple approach to access nested configuration values using a dot-notation key (e.g., "db.host").

## 7. Exercise — Build a Practical PHP Config System (Multi-Part)

Part A — Project setup
- Create a new PHP project (plain PHP or within a micro-framework you prefer).
- Install PHP dotenv: composer require vlucas/phpdotenv
- Add a .env file at project root with example values:
  DB_HOST=127.0.0.1
  DB_PORT=3306
  DB_NAME=exercise_db
  DB_USER=exercise
  DB_PASSWORD=secret-password
  APP_DEBUG=true
  CACHE_TTL=600

Part B — Config bootstrap
- Create config.php that defines defaults, loads environment variables with phpdotenv, and returns a final $config array (similar to Section 1). Ensure environment overrides win defaults and missing values fall back safely.

Part C — Accessor helper
- Implement a small helper function cfgGet($config, $path, $default = null) that supports dot-notation access.

Part D — Simple app bootstrapper
- Create bootstrap.php that loads config via require 'config.php'; sets PHP error reporting based on config, and prints a redacted summary of the config (e.g., hide passwords).

Part E — Database connection demonstration
- Create a script db_test.php that builds a PDO DSN from config:
  - If config['db']['type'] is 'sqlite', use SQLite DSN: "sqlite:" . __DIR__ . "/db.sqlite"
  - If 'mysql', use: "mysql:host=HOST;port=PORT;dbname=NAME"
- Attempt a PDO connection with the values from config and run a simple query SELECT 1 as test.
- Ensure errors are caught and reported without leaking secrets (e.g., show a generic error message on failure while logging the exception safely).

Part F — Non-existent var handling and defaults
- Extend your code to gracefully handle missing env vars by falling back to defaults, and ensure the app does not crash if a required var is absent. Demonstrate with cfgGet and defaults.

Part G — Optional: secret rotation and container context
- Outline how you would rotate DB_PASSWORD in a secret store and reference it into PHP via the environment, plus how you would verify the rotation by adding a test to ensure the updated password works without code changes.

Deliverables:
- A working PHP project structure that demonstrates environment-based config loading, safe defaults, secret handling, and a small runtime demonstration (db_test.php) that confirms the connection logic using the config.
- Clear comments in code explaining the rationale for each step and how it would scale in real systems.

Notes:
- Do not commit actual credentials in the repository. Use placeholders in the exercise and rely on environment setup to supply real values.
- The exercise emphasizes readability, testability, and maintainability in production-like scenarios.