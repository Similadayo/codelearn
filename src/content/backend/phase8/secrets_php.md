# Track: Backend Engineering — Phase 8 — Infrastructure & Deployment: Secrets Management & Production Config (PHP)

Secrets management is the discipline of handling credentials, API keys, tokens, and other sensitive configuration data securely across environments. In production PHP applications, secrets are not just a matter of keeping data out of version control; they are about controlled access, rotation, auditing, and minimizing blast radius when a secret leaks. This lesson covers practical patterns for loading, storing, rotating, and auditing secrets in PHP-based backends, focusing on real-world production workflows.

## 1. Secret Management Foundations

In modern PHP apps, secrets should never live in source code. The typical patterns are: environment variables, a local or remote config store (like a .env file used only in development), and a centralized secret store (cloud secret managers, KMS, Vault). This section demonstrates loading secrets from environment variables and a dotenv file as a baseline, before introducing centralized secret stores.

Example: load secrets via dotenv with a graceful fallback to environment variables, then initialize a PDO connection without exposing secrets in logs.

```php
<?php
// 1. Secret management foundations: load from dotenv (development) or env (production)
require __DIR__ . '/vendor/autoload.php'; // phpdotenv and other deps

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Prefer environment variables in production; dotenv is primarily for local dev
$DB_HOST     = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?? 'localhost';
$DB_NAME     = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?? 'app';
$DB_USER     = $_ENV['DB_USER'] ?? getenv('DB_USER') ?? 'root';
$DB_PASSWORD = $_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?? '';

if (empty($DB_PASSWORD)) {
    throw new RuntimeException('Database password is not configured.');
}

$dsn = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4";

$pdo = new PDO($dsn, $DB_USER, $DB_PASSWORD, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

// Use $pdo for queries, but ensure you never log $DB_PASSWORD or secrets
```

### Line-by-line explanation
- require __DIR__ . '/vendor/autoload.php';: Load Composer autoloader to bring in phpdotenv and PDO dependencies.
- use Dotenv\Dotenv;: Import the class to read a .env file in development if used.
- $dotenv = Dotenv::createImmutable(__DIR__); $dotenv->load();: Initialize and load environment variables from a .env file (in dev) without mutating the environment at runtime.
- $DB_HOST = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?? 'localhost';: Read the host from the environment, preferring $_ENV, then getenv(), and finally fallback to a default.
- $DB_NAME, $DB_USER, $DB_PASSWORD: Read credentials from the environment with sensible defaults or by failing if password is missing.
- if (empty($DB_PASSWORD)) { ... }: Fail fast if a critical secret is missing.
- $dsn = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4";: Build the DSN for PDO.
- $pdo = new PDO(...): Create a secure DB connection with error handling and sane fetch mode.
- Note: Do not log secrets; ensure any logging masks or omits secret values.

## 2. Centralized Secrets in the Cloud: AWS Secrets Manager

Production systems commonly fetch sensitive values from a centralized secret store. AWS Secrets Manager (or similar services) allows rotation, access control, and auditing. This example demonstrates retrieving a secret (JSON-encoded credentials) and using them to connect to a database. It also shows a lightweight in-process cache to avoid repeated calls within a short window.

```php
<?php
// 2. Centralized secrets in AWS Secrets Manager (with basic in-process caching)
require __DIR__ . '/vendor/autoload.php';

use Aws\SecretsManager\SecretsManagerClient;
use Aws\Exception\AwsException;

$region = 'us-east-1';
$secretName = 'prod/MyApp/DBCredentials';
$ttlSeconds = 300; // 5 minutes cache

$cache = [
    'secret' => null,
    'expiresAt' => 0
];

// Create client; rely on IAM role, instance profile, or environment credentials
$client = new SecretsManagerClient([
    'region' => $region,
    'version' => 'latest',
]);

function loadSecret(SecretsManagerClient $client, string $secretName, array &$cache, int $ttlSeconds): array {
    $now = time();
    if ($cache['secret'] !== null && $now < $cache['expiresAt']) {
        return $cache['secret'];
    }

    try {
        $result = $client->getSecretValue(['SecretId' => $secretName]);
        $secretString = $result->get('SecretString') ?? '';
        $credentials = json_decode($secretString, true);

        // Expected keys: host, username, password, database
        $cache['secret'] = [
            'host' => $credentials['host'] ?? 'localhost',
            'username' => $credentials['username'] ?? 'root',
            'password' => $credentials['password'] ?? '',
            'database' => $credentials['database'] ?? 'app',
        ];
        $cache['expiresAt'] = $now + $ttlSeconds;
        return $cache['secret'];
    } catch (AwsException $e) {
        // In production, log securely (redact secrets) and escalate
        throw new RuntimeException("Secret retrieval failed: " . $e->getMessage(), 0, $e);
    }
}

// Use cached secret when available
$secret = loadSecret($client, $secretName, $cache, $ttlSeconds);

$DB_HOST     = $secret['host'];
$DB_NAME     = $secret['database'];
$DB_USER     = $secret['username'];
$DB_PASSWORD = $secret['password'];

$dsn = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4";
$pdo = new PDO($dsn, $DB_USER, $DB_PASSWORD, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);
```

### Line-by-line explanation
- require __DIR__ . '/vendor/autoload.php';: Load AWS SDK for PHP and other dependencies.
- use Aws\SecretsManager\SecretsManagerClient; use Aws\Exception\AwsException;: Import AWS classes.
- $region, $secretName, $ttlSeconds: Define region, secret identifier, and TTL for caching.
- $cache array: Simple in-process cache to avoid frequent secret fetches.
- $client = new SecretsManagerClient([...]);: Instantiate the Secrets Manager client with region and credentials sourced from IAM roles or environment.
- function loadSecret(...): A helper that returns the secret, using the cache if valid.
- if the cache is expired or missing, call getSecretValue and parse the JSON to extract host, username, password, and database.
- Build DSN and create PDO instance with retrieved credentials.
- Secrets are kept in memory during the TTL and are not logged or printed.

## 3. Production Config Scopes and Hierarchies

In production, configuration precedence matters. Generally, you want a clear hierarchy: environment variables > cloud secret stores > runtime defaults. A small Config wrapper helps centralize the logic, enforce redaction for logs, and avoid accidentally leaking secrets through logs or error messages.

```php
<?php
// 3. Production config wrapper with clear precedence
final class Config {
    private array $cache = [];

    public function __construct(private array $defaults = []) {}

    // Precedence: env vars (applied via getenv/$_ENV) > defaults
    public function get(string $key, $default = null) {
        if (array_key_exists($key, $this->cache)) {
            return $this->cache[$key];
        }

        $value = getenv($key);
        if ($value === false) {
            $value = $_ENV[$key] ?? null;
        }

        if ($value === null) {
            // Fallback to explicit default if provided
            $value = $this->defaults[$key] ?? $default;
        }

        $this->cache[$key] = $value;
        return $value;
    }

    // Optional: helper to redacted logging
    public function redacted(string $key): string {
        return is_string($this->get($key)) ? '******' : (string)$this->get($key);
    }
}

// Example usage
$config = new Config([
    'DB_PASSWORD' => null,
]);

$dbHost = $config->get('DB_HOST', 'localhost');
$dbUser = $config->get('DB_USER', 'root');
$dbPassword = $config->get('DB_PASSWORD', '');
$dbName = $config->get('DB_NAME', 'app');

// Safer logging: never reveal secrets
error_log("Connecting to $dbHost/$dbName as $dbUser with password " . $config->redacted('DB_PASSWORD'));
```

### Line-by-line explanation
- final class Config { ... }: Define a small, immutable config helper with internal cache.
- private array $cache = [];: Memory cache of previously read keys.
- __construct(private array $defaults = []) {}: Optional defaults for missing keys.
- get(string $key, $default = null): Retrieves a value by key with the defined precedence.
- getenv($key) / $_ENV[$key]: Read from environment sources; production typically uses environment, not files.
- if ($value === null) { $value = $this->defaults[$key] ?? $default; }: Fallback to explicit defaults or caller-provided default.
- redacted(string $key): Helper to safely log a key’s presence without exposing the value.
- Example usage shows how to pull DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, with a log that redact passwords.

## 4. Secrets Rotation & Auditing

Rotation reduces risk if a secret is compromised. In production, enable secret rotation in the secret store (e.g., AWS Secrets Manager rotation). Your application should support fresh secrets without restart, use short TTL caches, and avoid logging raw secrets. This section demonstrates a minimal rotation-aware approach and how you’d audit access.

```php
<?php
// 4. Rotation-friendly pattern: refresh on TTL, avoid stale secrets
require __DIR__ . '/vendor/autoload.php';

use Aws\SecretsManager\SecretsManagerClient;
use Aws\Exception\AwsException;

$client = new SecretsManagerClient([
    'region' => 'us-east-1',
    'version' => 'latest',
]);

$secretName = 'prod/MyApp/DBCredentials';
$ttlSeconds = 300;

// Very small in-process cache
$secretCache = [
    'payload' => null,
    'expiresAt' => 0,
];

// Refresh function
function getSecret(SecretsManagerClient $c, string $name, array &$cache, int $ttl): array {
    $now = time();
    if ($cache['payload'] !== null && $now < $cache['expiresAt']) {
        return $cache['payload'];
    }
    try {
        $result = $c->getSecretValue(['SecretId' => $name]);
        $secretString = $result->get('SecretString') ?? '';
        $creds = json_decode($secretString, true);
        $payload = [
            'host' => $creds['host'] ?? 'localhost',
            'username' => $creds['username'] ?? 'root',
            'password' => $creds['password'] ?? '',
            'database' => $creds['database'] ?? 'app',
        ];
        $cache['payload'] = $payload;
        $cache['expiresAt'] = $now + $ttl;
        return $payload;
    } catch (AwsException $e) {
        throw new RuntimeException("Secret rotation load failed: " . $e->getMessage(), 0, $e);
    }
}

$secret = getSecret($client, $secretName, $secretCache, $ttlSeconds);
$DSN = "mysql:host={$secret['host']};dbname={$secret['database']};charset=utf8mb4";
$pdo = new PDO($DSN, $secret['username'], $secret['password'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

// Note: In production, add an audit trail (e.g., CloudWatch / CloudAudit) for secret access attempts.
// Do not log secrets; log metadata such as which secret was accessed, by which service, and timestamp.
```

### Line-by-line explanation
- Creates a Secrets Manager client and a minimal TTL cache for secrets.
- getSecret(...) checks the cache expiration; if expired or missing, fetches the secret value from AWS Secrets Manager.
- Parses JSON payload and normalizes fields (host, username, password, database).
- Uses the fresh credentials to construct DSN and instantiate PDO.
- Emphasizes auditing and redaction: avoid logging secret material, but record who accessed what secret and when.

## X. Common Beginner Mistakes

When starting with production config and secrets, beginners often trip over easily fixable errors. Here are real pitfalls with bad vs good code side-by-side.

- Pitfall 1: Hard-coding secrets in code
Bad:
```php
<?php
$dbPassword = 'P@ssw0rd!';
error_log("DB Password: $dbPassword"); // secret leaked in logs
```
Good:
```php
<?php
$dbPassword = $_ENV['DB_PASSWORD'] ?? '';
error_log("DB_PASSWORD provided: " . (empty($dbPassword) ? 'no' : 'yes'));
// Never log the actual secret
```

- Pitfall 2: Logging secrets or debug info
Bad:
```php
error_log("Connecting with password: $dbPassword");
```
Good:
```php
error_log("Connecting to DB at $DB_HOST:$DB_PORT as $DB_USER (password redacted)");
```

- Pitfall 3: Relying on a single config source everywhere
Bad:
```php
$host = 'localhost';
$user = 'root';
$password = 'root';
$pdo = new PDO("mysql:host=$host;dbname=db", $user, $password);
```
Good:
```php
// Use a Config wrapper + secrets store (env + secret store)
$host = $config->get('DB_HOST', 'localhost');
$user = $config->get('DB_USER', 'root');
$password = $config->get('DB_PASSWORD', '');
$pdo = new PDO("mysql:host=$host;dbname=" . $config->get('DB_NAME', 'db'), $user, $password);
```

- Pitfall 4: Not rotating credentials or setting rotation
Bad:
```php
$password = 'static-secret';
```
Good:
```php
// Fetch from Secrets Manager with rotation enabled and cached with TTL
$password = getSecret('prod/MyApp/DBPassword'); // rotation managed by secret store
```

- Pitfall 5: Exposed secrets in version control or error messages
Bad:
```php
echo "DB_PASSWORD=" . $dbPassword; // committed or exposed in output
```
Good:
```php
// Never print secrets; redact in logs and outputs
error_log("DB_PASSWORD redacted in logs");
```

## Y. Why This Matters In Real Systems

- Security and compliance: Secrets must be rotated, access-controlled, and audited. Automated rotation with proper permissions reduces blast radius.
- Separation of concerns: Developers deploy code; operations manage secrets. Centralized secret stores enforce least privilege and audit trails.
- Operational agility: With cache-friendly secret retrieval and TTL, apps avoid excessive latency while staying in sync with updated credentials.
- Cloud-native patterns: In containers/Kubernetes, mount secrets as environment variables or use dedicated secret management sidecars. In serverless, fetch per invocation with appropriate caching.
- Observability: Auditing secret access, failed retrievals, and rotation events helps meet security requirements and respond to incidents quickly.
- Reliability: Fail gracefully if a secret store is temporarily unavailable, with sane fallbacks or circuit breakers, and avoid cascading outages.

## Z. Study Questions

1. Why should secrets be loaded from environment variables or a centralized secret store instead of being hard-coded in source code?
2. What is the role of a TTL cache when fetching secrets from a cloud secret store, and why is it important?
3. How can you prevent secrets from appearing in logs or error messages?
4. Describe a simple precedence order for configuration in a production PHP application.
5. What are the benefits and risks of enabling rotation in a secret store like AWS Secrets Manager?

## Exercise

Part A — Build a SecretsLoader abstraction
- Create a PHP interface SecretsStore with a method getSecret(string $name): array.
- Implement EnvSecretsStore that reads secrets from environment variables (e.g., DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).
- Implement AwsSecretsManagerStore (optional for your environment) that fetches a JSON payload from AWS Secrets Manager and returns an associative array with keys host, username, password, database. Include a small TTL-based in-memory cache.

Part B — Create a Config wrapper
- Implement a Config class (as shown in Section 3) that supports retrieving DB_HOST, DB_USER, DB_PASSWORD, DB_NAME with a sensible default hierarchy and a redacted logging helper.
- Wire Config to use SecretsStore when a secret is not present in environment variables.

Part C — Small app that uses the abstraction
- Write a bootstrap script that:
  - Builds the SecretsStore (Env or AWS) based on an environment flag SECRET_STORE (e.g., "env" or "aws").
  - Loads DB credentials via a central function or class.
  - Creates a PDO connection and runs a simple query (e.g., SELECT 1).
  - Logs a sanitized message (not revealing secrets) indicating success or failure.

Part D — Rotation idea and test plan
- Describe how you would enable rotation in AWS Secrets Manager for your secret and how your PHP app would fetch fresh credentials when the TTL expires.
- Outline a minimal test plan: unit tests for Config->get, integration test that mocks AWS Secrets Manager client (or uses a local test secret file), and a log-sanitization test to ensure no secrets are printed.

Deliverable artifacts (to prepare):
- secrets_loader.php (interfaces and implementations)
- config.php (Config wrapper)
- bootstrap.php (demonstrates end-to-end usage)
- README.md with how-to steps for local dev and production deployment

End of lesson.