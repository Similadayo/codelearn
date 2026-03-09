# Phase 8 — Infrastructure & Deployment: Secrets Management & Production Config (Go)

Secrets management and robust production configuration are foundational for secure, reliable services. In Go, you typically separate configuration from code, load sensitive values from protected stores or environment variables, and support live rotation for minimal downtime. This lesson covers patterns, code examples, and production considerations to help you design, implement, and operate secret-aware Go services.

## 1. Config Patterns for Production Go Apps

In production, you want a clear separation between code, configuration, and secrets. The canonical approach:
- Treat all secrets as external to the binary.
- Prefer environment variables for per-deploy configuration.
- Provide a fallback to non-secret defaults only in non-prod environments.
- Centralize loading logic so you can swap secret sources (env, file, secret manager) with minimal code changes.

### Code: Basic environment-first config loader (Go)

```go
package main

import (
  "os"
  "strconv"
)

type Config struct {
  DBHost     string
  DBPort     int
  DBUser     string
  DBPassword string
  JWTSecret  string
}

func getenv(key, def string) string {
  if v := os.Getenv(key); v != "" {
    return v
  }
  return def
}

func LoadConfig() *Config {
  port := 5432
  if v := os.Getenv("DB_PORT"); v != "" {
    if n, err := strconv.Atoi(v); err == nil {
      port = n
    }
  }
  return &Config{
    DBHost:     getenv("DB_HOST", "localhost"),
    DBPort:     port,
    DBUser:     getenv("DB_USER", "postgres"),
    DBPassword: getenv("DB_PASSWORD", ""),
    JWTSecret:  getenv("JWT_SECRET", ""),
  }
}
```

### ### Line-by-line explanation breaking down each line

- Line 1: package main declares the executable package.
- Line 3-10: import block brings in os and strconv for environment access and string-to-int parsing.
- Line 12-17: Config struct defines the runtime configuration for the app (host, port, user, password, and JWT secret).
- Line 19-26: getenv helper reads an environment variable; if absent, returns a default value.
- Line 28-44: LoadConfig builds a Config from env vars with defaults and a parsed DB_PORT as an int.
- Line 31-33: If DB_PORT is set, attempt to parse to an int; otherwise keep default 5432.
- Lines 37-42: Fill the Config fields with values from env or defaults.

Notes:
- This pattern keeps secrets (DB password, JWT secret) out of code.
- In production, ensure JWTSecret and DBPassword come from a secrets store or a protected env source.

## 2. Loading Config from Local File and Env Overrides

Sometimes you want a baseline config file (e.g., config.json or config.yaml) and allow per-deploy overrides from environment variables. This section demonstrates a JSON-based approach with env overrides.

### Code: Load from JSON file with environment overrides (Go)

```go
package main

import (
  "encoding/json"
  "os"
  "strconv"
  "fmt"
)

type Config struct {
  DBHost     string `json:"db_host"`
  DBPort     int    `json:"db_port"`
  DBUser     string `json:"db_user"`
  DBPassword string `json:"db_password"`
  JWTSecret  string `json:"jwt_secret"`
}

func LoadConfigFromFile(path string) (*Config, error) {
  data, err := os.ReadFile(path)
  if err != nil {
    return nil, err
  }
  var cfg Config
  if err := json.Unmarshal(data, &cfg); err != nil {
    return nil, err
  }

  // Environment overrides take precedence
  if v := os.Getenv("DB_HOST"); v != "" {
    cfg.DBHost = v
  }
  if v := os.Getenv("DB_PORT"); v != "" {
    if n, err := strconv.Atoi(v); err == nil {
      cfg.DBPort = n
    }
  }
  if v := os.Getenv("DB_USER"); v != "" {
    cfg.DBUser = v
  }
  if v := os.Getenv("DB_PASSWORD"); v != "" {
    cfg.DBPassword = v
  }
  if v := os.Getenv("JWT_SECRET"); v != "" {
    cfg.JWTSecret = v
  }

  return &cfg, nil
}

func main() {
  cfg, err := LoadConfigFromFile("config.json")
  if err != nil {
    // handle error, or fallback to LoadConfig() logic
    fmt.Println("Fallback to defaults due to error:", err)
    return
  }
  // Use cfg as needed
  fmt.Printf("Config loaded: host=%s port=%d\n", cfg.DBHost, cfg.DBPort)
}
```

### ### Line-by-line explanation breaking down each line

- Line 1: package main for an executable.
- Lines 3-9: Import encoding/json for parsing JSON, os for file IO/env, strconv for numeric parsing, fmt for simple output.
- Lines 11-17: Config struct with JSON tags; used to map config.json fields.
- Lines 19-41: LoadConfigFromFile reads a JSON file, unmarshals into Config, then applies environment overrides.
- Lines 23-29: Read file contents and return error if reading fails.
- Lines 31-38: Unmarshal JSON into cfg; return error if parsing fails.
- Lines 41-58: Apply environment overrides for each field if present.
- Lines 60-66: main() demonstrates loading and using the config, with a basic print.

Notes:
- The merging strategy here is: file provides defaults; env vars override.
- If you prefer YAML, replace JSON parsing with a YAML library (keeping the env override pattern).
- For security, avoid logging the full secret values; consider redacting secrets in logs.

## 3. Remote Secrets Management: AWS Secrets Manager (Go v2)

External secret stores help rotate credentials without redeploying. AWS Secrets Manager is a common choice. This example shows how to fetch a secret at startup. In production, consider caching and rotation-aware patterns rather than re-fetching on every request.

### Code: Fetch a secret value from AWS Secrets Manager (Go)

```go
package main

import (
  "context"
  "log"
  "fmt"

  "github.com/aws/aws-sdk-go-v2/aws"
  "github.com/aws/aws-sdk-go-v2/config"
  "github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

func GetSecretValue(ctx context.Context, secretName string) (string, error) {
  cfg, err := config.LoadDefaultConfig(ctx)
  if err != nil {
    return "", err
  }
  svc := secretsmanager.NewFromConfig(cfg)

  input := &secretsmanager.GetSecretValueInput{
    SecretId: aws.String(secretName),
  }

  out, err := svc.GetSecretValue(ctx, input)
  if err != nil {
    return "", err
  }

  if out.SecretString != nil {
    return *out.SecretString, nil
  }

  // If secret is binary
  return string(out.SecretBinary), nil
}

func main() {
  ctx := context.Background()
  secret, err := GetSecretValue(ctx, "prod/db_password")
  if err != nil {
    log.Fatalf("failed to fetch secret: %v", err)
  }
  // Do not print secrets in production logs
  fmt.Printf("Fetched secret (length=%d)\n", len(secret))
}
```

### ### Line-by-line explanation breaking down each line

- Line 1: package main.
- Lines 3-9: Import statements for context, logging, AWS config, and Secrets Manager client.
- Lines 11-29: GetSecretValue loads AWS config, initializes a Secrets Manager client, and calls GetSecretValue with the secret name.
- Lines 18-23: LoadDefaultConfig reads credentials and region from environment or IAM roles.
- Lines 25-28: Create Secrets Manager client from the config.
- Lines 30-40: Build input with the secret name and call GetSecretValue.
- Lines 42-50: If SecretString is present, return it; otherwise return the binary secret.
- Lines 52-60: main demonstrates retrieval; in real apps you’d integrate with your config loader and cache results.

Notes:
- This requires AWS credentials to be available (environment variables, shared config, or EC2/ECS roles).
- Secrets in Secrets Manager are often JSON values; you may parse or extract fields as needed.
- For production, implement caching, versioning, and rotation awareness to avoid excessive fetches.

## 4. Secrets Rotation and Live Reload in Production

Secrets should rotate and deployments should support live config changes with minimal downtime. A typical approach:
- Centralize secrets with a rotation policy (e.g., 30 days).
- Load secrets at startup and refresh on a schedule or on demand.
- Support hot reload on signals (e.g., SIGHUP) or via a control plane webhook.
- Use thread-safe config storage (read-mostly patterns) to avoid hot-locks.

### Code: Live reload of configuration on SIGHUP (Go)

```go
package main

import (
  "fmt"
  "os"
  "os/signal"
  "strconv"
  "sync"
  "syscall"
)

type AppConfig struct {
  DBHost     string
  DBPort     int
  DBUser     string
  DBPassword string
  JWTSecret  string
}

type App struct {
  mu   sync.RWMutex
  cfg  *AppConfig
}

func LoadConfig() *AppConfig {
  port := 5432
  if v := os.Getenv("DB_PORT"); v != "" {
    if n, err := strconv.Atoi(v); err == nil {
      port = n
    }
  }
  return &AppConfig{
    DBHost:     os.Getenv("DB_HOST"),
    DBPort:     port,
    DBUser:     os.Getenv("DB_USER"),
    DBPassword: os.Getenv("DB_PASSWORD"),
    JWTSecret:  os.Getenv("JWT_SECRET"),
  }
}

func (a *App) Reload() {
  newCfg := LoadConfig()
  a.mu.Lock()
  a.cfg = newCfg
  a.mu.Unlock()
  // If you manage resources (DB pools, caches), reinitialize here.
  fmt.Println("Configuration reloaded")
}

func (a *App) Run() {
  // Initial load
  a.Reload()

  // Listen for SIGHUP to reload configuration
  sigs := make(chan os.Signal, 1)
  signal.Notify(sigs, syscall.SIGHUP)

  for range sigs {
    a.Reload()
  }
}

func main() {
  app := &App{}
  go app.Run()

  // In a real app you would run your HTTP server or background workers here.
  select {}
}
```

### ### Line-by-line explanation breaking down each line

- Line 1: package main for a standalone executable.
- Lines 3-12: Import statements for synchronization, OS signals, and system calls.
- Lines 14-20: AppConfig holds the runtime configuration with DB and JWT values.
- Lines 22-28: App is a wrapper that safely stores the current configuration with a read/write mutex.
- Lines 30-41: LoadConfig reads environment variables and builds an AppConfig; includes port parsing.
- Lines 43-52: Reload creates a new config and atomically swaps it into App.cfg; can be extended to reinitialize resources.
- Lines 54-66: Run sets up SIGHUP handling to trigger Reload on demand.
- Lines 68-75: main initializes App and starts the reload loop in a goroutine; blocks main.

Notes:
- This pattern supports zero-downtime config changes as long as you reuse the in-memory config and conscientiously reinitialize dependent resources on swap.
- In production, integrate with a secret store (env via a sidecar, Vault, or Secrets Manager) and add audit logging for rotations.

## X. Common Beginner Mistakes

- 1) Hardcoding secrets in code
  Bad:
  ```go
  // BAD: secret embedded in code
  const DBPassword = "supersecret-password"
  ```
  Good:
  ```go
  // GOOD: fetch from environment/secret store
  package main
  import "os"
  var DBPassword = os.Getenv("DB_PASSWORD")
  ```
  ### Line-by-line explanation
  - The bad example embeds credentials in the binary, making them difficult to rotate and easy to leak if the binary is shared.
  - The good example reads from environment variables, allowing rotation without changing code.

- 2) Logging secrets or printing sensitive values
  Bad:
  ```go
  log.Printf("DB_PASSWORD=%s", os.Getenv("DB_PASSWORD"))
  ```
  Good:
  ```go
  log.Println("DB_PASSWORD=[REDACTED]")
  // Or redact with a helper
  ```
  ### Line-by-line explanation
  - The bad approach records actual secrets in logs, creating audit and exposure risks.
  - The good approach redacts secrets to protect sensitive information while preserving useful logs.

- 3) Not handling rotation or cache invalidation
  Bad:
  ```go
  // Re-read once at startup; no refresh
  secret := GetSecretFromStore()
  ```
  Good:
  ```go
  // Cache secret with expiration and refresh on demand or SIGHUP
  ```
  ### Line-by-line explanation
  - The bad approach never refreshes secrets, risking stale credentials.
  - The good approach supports rotation via time-based caching or explicit reload signals.

- 4) Storing secrets on disk in plaintext
  Bad:
  ```go
  // Secrets.json checked into repo
  {
    "db_password": "plaintext"
  }
  ```
  Good:
  ```go
  // Use a secret store or encrypted file with proper permissions
  // and avoid storing secrets in the repository.
  ```
  ### Line-by-line explanation
  - Storing plaintext secrets in code or repo history is high risk.
  - Production-grade setups use secret stores or encrypted storage with strict access controls.

## Y. Why This Matters In Real Systems

- Security: Secrets must be protected at rest and in transit. Avoid embedding secrets in binaries; use secret stores, KMS, or environment-based approaches with strict access control and auditing.
- Rotation: Systems should rotate credentials without redeployments. Centralized secret management enables automated rotation and reduces blast radius when credentials are compromised.
- Compliance: Many industries require robust secrets management (PCI-DSS, SOC 2, HIPAA). Centralized, auditable secret access aligns with controls.
- Reliability: Production config patterns must support hot reloads and zero-downtime deployments. Thread-safe config and cache invalidation reduce restart costs.
- Observability: Redact secrets in logs, monitor secret fetch latencies, and audit secret access requests to detect anomalies.

## Z. Study Questions

1) What is the difference between a config value and a secret, and how should each be sourced in Go?  
2) How would you fetch a secret value from AWS Secrets Manager using Go? Outline the steps and a minimal code example.  
3) Why is redacting secrets in logs important, and how can you implement redaction in practice?  
4) Describe a pattern to support live config rotation in a running Go service. What synchronization primitives would you use?  
5) What are the consequences of hardcoding secrets in binaries or repositories, and what strategies mitigate this risk?

## Exercise

Part A: Build a small secret-aware config loader in Go

- Objective: Create a small Go module that loads configuration from environment variables, with an optional local config.json file as a baseline, and supports environment overrides. The module should expose a single Config struct and a LoadConfig function.

- Deliverables:
  - A Config struct with fields for DBHost, DBPort, DBUser, DBPassword, JWTSecret.
  - A LoadConfigFromFile(path string) (*Config, error) function that loads JSON config and applies env overrides.
  - A simple main.go that loads from config.json (if present) and prints the host/port with the secret redacted.

- Starter code (starter.go):
```go
package main

import (
  "fmt"
  "os"
)

type Config struct {
  DBHost     string
  DBPort     int
  DBUser     string
  DBPassword string
  JWTSecret  string
}

// Note: You can reuse LoadConfigFromFile from Section 2 as a reference pattern.
// This is a simplified placeholder for students to implement.
func LoadConfigFromFile(path string) (*Config, error) {
  // TODO: implement JSON load + env overrides
  return &Config{
    DBHost:     "localhost",
    DBPort:     5432,
    DBUser:     "postgres",
    DBPassword: "placeholder",
    JWTSecret:  "secret",
  }, nil
}

func redact(s string) string {
  if len(s) == 0 {
    return ""
  }
  if len(s) <= 4 {
    return "****"
  }
  return s[:2] + "****" + s[len(s)-2:]
}

func main() {
  cfg, err := LoadConfigFromFile("config.json")
  if err != nil {
    fmt.Println("error loading config:", err)
    os.Exit(1)
  }
  fmt.Printf("config: host=%s port=%d user=%s jwt=%s\n",
    cfg.DBHost, cfg.DBPort, cfg.DBUser, redact(cfg.JWTSecret))
}
```

Part B: Extend to fetch a secret from AWS Secrets Manager (optional)

- Add a GetSecretValue function using AWS SDK v2 (as shown in Section 3) and wire it to populate cfg.DBPassword or cfg.JWTSecret if a secret name is provided via an environment variable (e.g., SECRET_NAME).

Part C: Add a tiny HTTP server that exposes a /config endpoint

- Create a minimal HTTP server that serves a JSON representation of the current config with secrets redacted.

Part D: Implement SIGHUP-based config reload

- Extend the app to listen for SIGHUP and reload the config from file and environment, replacing the in-memory config atomically.

Hints:
- Keep secrets out of logs; redact if printed or served via endpoints.
- Consider caching remote secrets locally with a short expiration to balance latency and rotation.
- Ensure your code compiles with Go 1.18+ and uses thread-safe access to the shared config.

This completes a practical, multi-part coding challenge that reinforces the concepts covered in this lesson: environment-driven configuration, local config overrides, remote secret stores, and live reload in Go-based production services.