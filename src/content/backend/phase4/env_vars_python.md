# Environment Variables & Config Management in Python (Backend Engineering - Phase 4: Building Web Servers)

Compelling introductory paragraph: In backend engineering, configuration is the glue that makes deployments portable, secure, and predictable. Environment variables provide a lightweight, zero-change way to customize behavior across development, staging, and production without altering code. Config management—and validating those configurations—helps prevent runtime errors, security leaks, and hard-to-debug issues when services scale. This lesson focuses on how Python apps read, validate, and manage configuration via environment variables, how to layer the config with files, and how to do safe, production-ready patterns in web servers.

## 1. Basic Environment Variables in Python

This section covers the fundamentals: how to read environment variables using the standard library, provide sensible defaults, and perform simple type conversions.

```python
# basic_env.py
import os

# Read PORT as an int, defaulting to 8000 if not set
PORT = int(os.environ.get("PORT", "8000"))

# Read DEBUG as a boolean-like value
DEBUG_STR = os.environ.get("DEBUG", "0")
DEBUG = DEBUG_STR in ("1", "true", "TRUE", "yes", "YES")

# Read a secret-like value (do not print or log this in real apps)
DATABASE_URL = os.environ.get("DATABASE_URL")

print(f"Starting on port {PORT} with debug={DEBUG}")
if DATABASE_URL:
    print("DATABASE_URL is configured (not printed for security).")
```

### Line-by-line explanation
1) Import the os module to access environment variables.  
2) Read the PORT variable; if not present, fall back to the string "8000", then convert to int.  
3) Read the DEBUG variable as a string and convert to a boolean by comparing against common truthy values.  
4) Read the sensitive DATABASE_URL variable; if missing, it will be None.  
5) Print startup information (avoid printing secrets in real productions).  
6) Conditionally acknowledge that a database URL is configured without exposing it.

## 2. Managing Config Across Environments (Using Pydantic BaseSettings)

Modern Python projects benefit from structured, validated configuration. Pydantic’s BaseSettings provides a robust way to model config, load from environment variables, and optionally read from a .env file.

```python
# config_settings.py
from pydantic import BaseSettings

class Settings(BaseSettings):
    app_name: str = "MyApp"
    port: int = 8000
    debug: bool = False
    database_url: str

    class Config:
        env_file = ".env"      # Optional: read from a .env file
        # If you prefer a flat mapping from env vars, don't set env_prefix

settings = Settings()

# Example usage
def main():
    print(f"App: {settings.app_name}")
    print(f"Port: {settings.port}")
    print(f"Debug: {settings.debug}")
    # Avoid printing sensitive data in real logs
    if settings.database_url:
        print("DATABASE_URL configured (value not shown)")

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
1) Import BaseSettings from pydantic to define a strongly-typed configuration model.  
2) Define Settings with default values for app_name, port, and debug; database_url has no default to force explicit config.  
3) In Config, specify .env file loading via env_file = ".env" (optional).  
4) Instantiate the Settings model which automatically reads from environment and .env (if present) and validates types.  
5) Define a main() function to demonstrate usage of the settings.  
6) Print non-sensitive data to confirm the config loaded.  
7) Run main() when the module is executed as a script.

Note: If you don’t want a .env file, simply omit env_file in Config; BaseSettings still reads from environment variables.

Optional: Use a .env file with keys like:
APP_NAME=MyApp
PORT=8080
DEBUG=true
DATABASE_URL=postgresql://user:pass@host/db

If you want to namespace the keys differently, you can use env_prefix in Config, which will prepend a prefix to all field names (e.g., APP_, APP_PORT, APP_DEBUG, APP_DATABASE_URL). Adjust accordingly to your team’s conventions.

## 3. Secrets Handling & Security Considerations

Environment variables are a great pattern for secrets, but they must be handled carefully. This section shows safe usage patterns and common mistakes to avoid.

```python
# secrets_safe.py
import os
import logging
from pydantic import BaseSettings

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    app_name: str = "MyApp"
    port: int = 8000
    debug: bool = False
    database_url: str
    secret_key: str

    class Config:
        env_file = ".env"

settings = Settings()

def startup_log(cfg: Settings):
    logger.info("Starting %s on port %d (debug=%s)", cfg.app_name, cfg.port, cfg.debug)
    # Do NOT log sensitive values
    logger.info("Secret key length: %d", len(cfg.secret_key))

def main():
    startup_log(settings)

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
1) Import os and logging to configure a non-intrusive, level-controlled logger.  
2) Import BaseSettings for a typed config model.  
3) Configure logging via an environment variable LOG_LEVEL (default INFO).  
4) Define a Settings class including secret_key (marked sensitive) and other common fields.  
5) Use env_file to optionally read values from .env.  
6) Instantiate Settings; this validates types and ensures required fields (like database_url and secret_key) are present unless defaults are provided.  
7) Define startup_log(cfg) to log non-sensitive startup information only (avoid printing secret_key or connection strings).  
8) Run startup_log with the current settings in main().

Common-safe practice notes:
- Never print or log SECRET_KEY, DATABASE_URL, or other credentials in logs or responses.
- Use dedicated secret management (e.g., cloud secret stores) for production, and rotate secrets regularly.
- Consider masking sensitive fields in any telemetry or health endpoints.

## 4. Loading Config in a Web Server (FastAPI example with live reload)

This section demonstrates a tiny web server that consumes environment-based config and can “reload” config at runtime to reflect environment changes without a full restart (for demonstrative purposes). In real production, you’d typically restart services to pick up env changes or mount new config from a sidecar.

```python
# app_with_reload.py
from fastapi import FastAPI
from pydantic import BaseSettings
import os

class Settings(BaseSettings):
    app_name: str = "MyApp"
    port: int = 8000
    debug: bool = False
    database_url: str = ""
    secret_key: str = ""

    class Config:
        env_file = ".env"

# Global settings cache (for demonstration)
_current_settings = Settings()

def get_settings() -> Settings:
    return _current_settings

def reload_settings() -> Settings:
    global _current_settings
    _current_settings = Settings()  # reload from env/.env
    return _current_settings

app = FastAPI(title=get_settings().app_name)

@app.get("/config")
def read_config():
    s = get_settings()
    # Expose only non-sensitive fields
    return {
        "app_name": s.app_name,
        "port": s.port,
        "debug": s.debug,
        "database_url_present": bool(s.database_url),
    }

@app.post("/reload-config")
def reload_config():
    s = reload_settings()
    app.title = s.app_name
    return {"status": "reloaded", "app_name": s.app_name}

@app.get("/health")
def health():
    return {"status": "ok"}

# To run: uvicorn app_with_reload:app --reload
```

### Line-by-line explanation
1) Import FastAPI and Pydantic’s BaseSettings to build a typed config model and the web server.  
2) Define Settings with defaults and the location of the .env file for loading.  
3) Create a module-level cache _current_settings to simulate a running config store.  
4) get_settings() returns the current in-memory settings instance.  
5) reload_settings() re-instantiates Settings from the environment and updates the in-memory store.  
6) Create a FastAPI app using the current app_name as the title.  
7) /config endpoint returns non-sensitive information about the current config.  
8) /reload-config endpoint triggers a reload of the settings and updates the app title.  
9) /health endpoint provides a simple liveness check.  
10) Comment: Run with uvicorn app_with_reload:app --reload (for development; in production, configuration reloads are typically managed by the hosting environment).  

Note: In real systems, avoid exposing secrets even via endpoints; ensure endpoints only reveal non-sensitive configuration. For truly dynamic configuration, consider a dedicated config service or sidecar pattern.

## X. Common Beginner Mistakes

- Bad: Printing secrets or full connection strings in logs or responses.
  - Good:
    Bad
    Code: print(f"DATABASE_URL={DATABASE_URL}")  # dangerous
    Good
    Code: logger.info("Config loaded (non-sensitive).")
- Bad: Not validating environment variables or missing required values.
  - Good:
    Bad
    Code: database_url = os.environ["DATABASE_URL"]  # KeyError if missing
    Good
    Code: from pydantic import BaseSettings; class Settings(BaseSettings): database_url: str; settings = Settings()  # raises if missing
- Bad: Relying on a single source without a clear precedence (e.g., environment only after code expects config in a file).
  - Good
  Code: Use a layered approach: .env for local dev, environment vars for prod, and a validation layer (BaseSettings) to enforce types and presence.
- Bad: Not handling type mismatches, causing runtime errors during startup.
  - Good
  Code: Define types in a config model (e.g., port: int) and rely on pydantic to coerce/validate values; fail fast with a clear message.

## Y. Why This Matters In Real Systems

- 12-Factor Apps principle: config is environment-based and separate from code, enabling consistent deploys across environments.
- Secrets management: store secrets in environment variables but use secret stores for rotation, auditing, and access control.
- Versioned defaults and validation: a typed config model prevents subtle bugs when env vars are missing or mis-typed.
- Operational flexibility: dynamic reloading (as a demo) can help during ephemeral testing; production often uses service restarts or orchestrator-level config updates.
- Observability: mask sensitive information in logging and dashboards; never leak credentials in traces or metrics.

## Z. Study Questions

1) What is the advantage of using environment variables over hard-coded configuration values?  
2) How does Pydantic’s BaseSettings help with environment-based configuration?  
3) Why should you avoid printing or logging sensitive values like DATABASE_URL or SECRET_KEY?  
4) What is the difference between loading from a .env file and loading from actual environment variables?  
5) How might you implement runtime config reloads in a web server, and what are the caveats?

## Exercise

Part A — Create a reusable config module
- Task: Build a small module config.py that defines a Settings class using Pydantic BaseSettings and exposes a get_settings() function and a reload_settings() function.
- Deliverables:
  - A Settings model with fields: app_name (str), port (int), debug (bool), database_url (str), secret_key (str).
  - Config to load from a .env file in the project root.
  - get_settings() returning the current Settings instance.
  - reload_settings() re-reading values from the environment and updating the internal instance.
- .env example (not committed with secrets in real repos):
  APP_NAME=MyApp
  PORT=8000
  DEBUG=true
  DATABASE_URL=postgresql://user:pass@localhost/db
  SECRET_KEY=supersecret

Code blocks are provided below with line-by-line explanations.

```python
# config.py
from typing import Optional
from pydantic import BaseSettings

class Settings(BaseSettings):
    app_name: str = "MyApp"
    port: int = 8000
    debug: bool = False
    database_url: str = ""
    secret_key: str = ""

    class Config:
        env_file = ".env"

# Internal cache of settings
_current_settings: Optional[Settings] = None

def load_settings() -> Settings:
    return Settings()

def get_settings() -> Settings:
    global _current_settings
    if _current_settings is None:
        _current_settings = load_settings()
    return _current_settings

def reload_settings() -> Settings:
    global _current_settings
    _current_settings = load_settings()
    return _current_settings
```

### Line-by-line explanation
1) Import Optional for type hints and BaseSettings for a typed config model.  
2) Define Settings with defaults and explicit types for safe loading.  
3) Use Config with env_file to optionally read from a .env file.  
4) Create a module-level cache _current_settings to hold the active configuration.  
5) Define load_settings() to instantiate a new Settings object (reads environment/.env).  
6) Implement get_settings() to return the cached settings, initializing it on first use.  
7) Implement reload_settings() to re-read environment variables and update the cache.  

```python
# app.py
from fastapi import FastAPI
from config import get_settings, reload_settings

app = FastAPI(title="ConfigDemo")

@app.get("/config")
def read_config():
    s = get_settings()
    return {
        "app_name": s.app_name,
        "port": s.port,
        "debug": s.debug,
    }

@app.post("/reload-config")
def reload_config():
    s = reload_settings()
    app.title = s.app_name
    return {"status": "reloaded", "app_name": s.app_name}
```

### Line-by-line explanation
1) Import FastAPI to build a tiny web server, and import config helpers.  
2) Create a FastAPI instance with an initial title.  
3) Define /config to expose non-sensitive config values via HTTP.  
4) Define /reload-config that refreshes the configuration from the environment and updates the app title.  
5) The endpoints demonstrate how a running server could adapt to config changes without a full restart (in a controlled development context).

Run instructions:
- Install dependencies: pip install fastapi uvicorn pydantic
- Start server: uvicorn app.py:app --reload
- Test:
  - GET http://localhost:8000/config to view the current non-sensitive config
  - POST http://localhost:8000/reload-config to simulate reloading config

Notes and best practices:
- Do not expose secrets in API responses.
- In production, prefer orchestrator-managed config updates and container restarts, or a dedicated configuration service.
- Consider adding more robust validation and defaults, or integrating with a secret management service for sensitive values.
- Extend unit tests to verify that missing env vars cause a clear failure, and that type coercion behaves as expected.