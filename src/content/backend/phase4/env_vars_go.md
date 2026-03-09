# Track: Backend Engineering — Module: Phase 4 — Building Web Servers

Environment Variables & Config Management are foundational to building reliable, portable, and secure Go backends. This lesson covers how to read, validate, and compose configuration from environment variables and config files, how to structure config in Go, and best practices for production systems. You’ll learn to apply 12-factor principles, support multiple environments, and manage secrets safely in real deployments.

## 1. Understanding Environment Variables and Config Management

Environment variables are a simple, portable way to configure apps without changing code. Config management combines env vars, config files (YAML/JSON), and sometimes secret stores to provide predictable behavior across environments (dev, test, staging, prod). In production, you typically:

- Use a defaults layer in code for sane defaults.
- Override with a config file for environment-specific values.
- Further override with environment variables for per-deploy tweaks.
- Treat secrets (DB passwords, API keys) with care—avoid logging them.

Code example demonstrating basic env var access and a fallback:

```go
package main

import (
  "fmt"
  "os"
)

func main() {
  // Read environment variable; may be empty if not set
  dbHost := os.Getenv("DB_HOST")
  fmt.Println("DB_HOST =", dbHost)
}
```

### Line-by-line explanation
- 1: Declares the package as main, an executable program.
- 3-7: Imports standard library packages used in this snippet.
- 9-15: In main, reads the DB_HOST environment variable using os.Getenv, which returns "" if not set.
- 16: Prints the value, illustrating how env vars are surfaced at runtime.

## 2. Reading Environment Variables with Fallbacks and Validation

Often you want a default when an env var isn’t provided. This reduces failures due to missing configuration and makes local development smoother.

```go
package main

import (
  "fmt"
  "os"
)

func getEnv(key, def string) string {
  if v, ok := os.LookupEnv(key); ok && v != "" {
    return v
  }
  return def
}

func main() {
  host := getEnv("DB_HOST", "localhost")
  port := getEnv("DB_PORT", "5432")
  fmt.Printf("Connecting to %s:%s\n", host, port)
}
```

### Line-by-line explanation
- 1-7: Package and imports for main program and environment access.
- 9-16: getEnv checks if an environment variable is set and non-empty using os.LookupEnv; returns the provided default otherwise.
- 18-25: main uses getEnv to obtain DB_HOST and DB_PORT with sensible defaults, then prints a connection string.
- By using LookupEnv, you distinguish between unset and explicitly empty values, enabling more precise behavior.

## 3. Defining a Config Struct and Loading with Defaults

Structuring configuration in a single Config type improves clarity and testability. This example uses only the standard library and env vars with defaults.

```go
package main

import (
  "fmt"
  "os"
  "strconv"
)

type Config struct {
  DBHost string
  DBPort int
  DBUser string
  DBPass string
  AppEnv string
  Debug  bool
}

func LoadConfig() Config {
  cfg := Config{
    DBHost: "localhost",
    DBPort: 5432,
    DBUser: "postgres",
    DBPass: "",
    AppEnv: "development",
    Debug:  false,
  }

  if v, ok := os.LookupEnv("DB_HOST"); ok && v != "" { cfg.DBHost = v }
  if v, ok := os.LookupEnv("DB_PORT"); ok && v != "" {
    if p, err := strconv.Atoi(v); err == nil { cfg.DBPort = p }
  }
  if v, ok := os.LookupEnv("DB_USER"); ok && v != "" { cfg.DBUser = v }
  if v, ok := os.LookupEnv("DB_PASS"); ok && v != "" { cfg.DBPass = v }
  if v, ok := os.LookupEnv("APP_ENV"); ok && v != "" { cfg.AppEnv = v }
  if v, ok := os.LookupEnv("DEBUG"); ok && v != "" {
    if b, err := strconv.ParseBool(v); err == nil { cfg.Debug = b }
  }

  return cfg
}

func main() {
  cfg := LoadConfig()
  fmt.Printf("%+v\n", cfg)
}
```

### Line-by-line explanation
- 1-6: Package and import declarations.
- 8-15: Config struct defines typed fields for host, port, credentials, environment, and a debug flag.
- 17-32: LoadConfig initializes cfg with defaults. Each environment variable is optionally applied if present and non-empty. Port is parsed to int; Debug is parsed to bool. Any invalid parse keeps the default.
- 34-37: main loads and prints the resulting config for visibility during development.

## 4. Centralized Config with Files + Environment Variables (Using Viper)

In real systems you typically support a config file (e.g., YAML) plus environment overrides. Viper is a popular choice in Go for this pattern. It provides defaults, file loading, and environment overrides with clear precedence (env vars override config values, which override defaults).

```go
package main

import (
  "fmt"
  "log"

  "github.com/spf13/viper"
)

type Config struct {
  DBHost string
  DBPort int
  DBUser string
  DBPass string
  AppEnv string
}

func LoadConfig() Config {
  v := viper.New()

  // Config file preferences
  v.SetConfigName("config")
  v.SetConfigType("yaml")
  v.AddConfigPath(".")

  // Defaults
  v.SetDefault("db.host", "localhost")
  v.SetDefault("db.port", 5432)
  v.SetDefault("db.user", "postgres")
  v.SetDefault("db.pass", "")
  v.SetDefault("app.env", "development")

  // Read config file if present
  if err := v.ReadInConfig(); err != nil {
    log.Println("No config file loaded:", err)
  }

  // Environment overrides
  v.AutomaticEnv()
  v.SetEnvPrefix("APP")
  v.BindEnv("db.host", "DB_HOST")
  v.BindEnv("db.port", "DB_PORT")
  v.BindEnv("db.user", "DB_USER")
  v.BindEnv("db.pass", "DB_PASS")
  v.BindEnv("app.env", "APP_ENV")

  cfg := Config{
    DBHost: v.GetString("db.host"),
    DBPort: v.GetInt("db.port"),
    DBUser: v.GetString("db.user"),
    DBPass: v.GetString("db.pass"),
    AppEnv: v.GetString("app.env"),
  }
  return cfg
}

func main() {
  cfg := LoadConfig()
  fmt.Printf("%+v\n", cfg)
}
```

YAML example (config.yaml) loaded by Viper (optional file):

```yaml
# config.yaml
db:
  host: "db.example.com"
  port: 5432
  user: "appuser"
  pass: "s3cr3t"
app:
  env: "production"
```

### Line-by-line explanation
- 1-9: Package and imports. viper is imported for config management.
- 12-15: Config struct defines the in-code representation for DB and App environment settings.
- 17-25: LoadConfig sets up a Viper instance, defines config defaults, and tries to read a config file named config.yaml from the current directory.
- 27-33: Viper is configured to read environment variables with the APP_ prefix, and to bind specific keys to environment variables (DB_HOST, DB_PORT, DB_USER, DB_PASS, APP_ENV). This enables env-var overrides.
- 35-40: Build the Config from Viper’s values.
- 42-47: main calls LoadConfig and prints the resulting struct.
- 50-58: YAML config example showing how file-based configuration might look (db and app sections).

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

Pitfall 1: Not validating or defaulting env vars
- Bad:
```go
package main

import "os"

func main() {
  host := os.Getenv("DB_HOST")
  port := os.Getenv("DB_PORT")
  // If not set, host/port can be empty strings
  _ = host
  _ = port
}
```
- Good:
```go
package main

import "fmt"

func getEnv(key, def string) string {
  // return default if not set or empty
  return def
}

func main() {
  host := getEnv("DB_HOST", "localhost")
  port := getEnv("DB_PORT", "5432")
  fmt.Printf("Connecting to %s:%s\n", host, port)
}
```
### Line-by-line explanation
- Bad: Reads env vars without defaults; code may fail later due to empty values.
- Good: Encapsulates default logic in a helper for reuse and clarity.

Pitfall 2: Embedding secrets in code
- Bad:
```go
package main

func main() {
  dbPass := "supersecret"
  _ = dbPass
}
```
- Good:
```go
package main

import "os"

func main() {
  dbPass := os.Getenv("DB_PASS")
  // If needed, enforce presence or redact in logs
  _ = dbPass
}
```
### Line-by-line explanation
- Bad: Secret stored in source code, risk of leakage and accidental commits.
- Good: Secrets come from env vars or a secret store; easier rotation and access control.

Pitfall 3: Not centralizing config (magic values)
- Bad:
```go
package main

const dbPort = 5432
func main() {
  _ = dbPort
}
```
- Good:
```go
package main

type Config struct{ DBPort int }

func defaultConfig() Config { return Config{ DBPort: 5432 } }

func main() {
  cfg := defaultConfig()
  // Optionally override with env or file
  _ = cfg
}
```
### Line-by-line explanation
- Bad: Hardcodes values in code, making it hard to adapt per environment.
- Good: Centralizes defaults in a config object, enabling overrides without code changes.

Pitfall 4: Ignoring type-safety when parsing values
- Bad:
```go
package main

import "strconv"

func main() {
  portStr := "not-a-number"
  port := portStr // incorrect type
  _ = port
}
```
- Good:
```go
package main

import (
  "fmt"
  "strconv"
)

func main() {
  portStr := "5432"
  port, err := strconv.Atoi(portStr)
  if err != nil {
    panic("invalid port")
  }
  fmt.Println("port:", port)
}
```
### Line-by-line explanation
- Bad: Assumes string can be used as a number, leading to runtime errors.
- Good: Validates and converts with error handling, improving reliability.

## Y. Why This Matters In Real Systems — production context and real usage

- Consistency across environments: Use defaults, config files, and env vars so behavior is predictable from dev to prod.
- 12-factor alignment: Separation of config from code reduces redeploys and enables per-environment tuning.
- Secrets handling: Never log secrets; avoid printing DB passwords. Prefer env vars or secret stores with access controls, rotation, and auditing.
- Observability and debugging: Centralized config loading makes it easier to reproduce issues by inspecting loaded config.
- Containerized and orchestrated deployments: In Docker/Kubernetes, env vars or ConfigMaps/Secrets provide a clean way to inject config without code changes.
- Testing: Configs are mockable. You can write tests that inject different env values or config files to validate behavior.
- Performance and security: Validate values early, fail fast on misconfiguration, and avoid expensive work when config is invalid.

## Z. Study Questions — 5 recall questions

1) What is the difference between os.Getenv and os.LookupEnv in Go?
2) How do you provide default configuration values in Go without duplicating logic?
3) How can you combine a YAML config file with environment variables in Go, and which has precedence?
4) Why should secrets not be logged, and what strategies help protect them in production?
5) What is a simple approach to validate and parse a numeric config value (e.g., a port) safely?

## Exercise — a practical multi-part coding challenge

Part A: Build a basic config loader with environment variables
- Create a small Go program (config-app) that defines a Config struct with:
  - DBHost (string)
  - DBPort (int)
  - AppEnv (string)
  - Debug (bool)
- Implement LoadConfigFromEnv() that:
  - Uses defaults: DBHost="localhost", DBPort=5432, AppEnv="development", Debug=false
  - Reads overrides from DB_HOST, DB_PORT, APP_ENV, DEBUG
  - Parses DB_PORT to int and DEBUG to bool with safe error handling
- Print the final Config using a well-formatted struct print (fmt.Printf("%+v\n", cfg)).

Part B: Extend to config files with environment overrides (Viper)
- Add Viper to the project (go.mod) and implement LoadConfig() as in Section 4.
- Create an optional config.yaml in the project root:
  db:
    host: "db.example.com"
    port: 5432
    user: "appuser"
    pass: "s3cr3t"
  app:
    env: "production"
- Run with different environments:
  - No config file, no env vars: observe defaults.
  - Config file present, no env vars: observe file values.
  - Env vars present (e.g., APP_ENV=staging, DB_HOST=db.pipeline): observe env overrides last.
- Ensure that logs or stdout do not print sensitive values (mask DB_PASS when printing).

Part C: Testing and safety checks
- Write a small test that injects environment variables and asserts that LoadConfigFromEnv() returns expected values.
- Add a function RedactConfig(cfg Config) Config that returns a copy with DBPass masked (e.g., "*****") for safe logging.

Deliverables:
- A Go module with main.go implementing Part A, plus an optional main_with_viper.go implementing Part B.
- A config.yaml example showing how to configure values.
- A test file config_test.go validating env-based loading.
- A short README snippet in the repo describing usage and expected precedence (env > file > defaults).

Note: In real projects, prefer a dedicated secret management approach for passwords and API keys, and avoid printing secrets in logs. This exercise demonstrates the mechanics of env-based and file-based configuration, plus how to combine them in production-grade Go services.