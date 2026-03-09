# Track: Backend Engineering — Phase 8: Infrastructure & Deployment
## Topic: Secrets Management & Production Config (Python)

Secrets management is a foundational capability for secure, scalable backend systems. In production, applications must load configuration and credentials from trusted sources, rotate them safely, enforce least privilege, and provide observable access events. This lesson teaches practical patterns for Python apps—from local development to cloud-native deployments—so your services stay secure, auditable, and resilient.

## 1. Secrets as a First-Class Concern in Python Apps
In production, secrets should never be baked into code or checked into version control. A common, robust pattern is to separate configuration from code and fetch secrets from a dedicated store or environment. This section introduces a practical Python approach that uses environment variables for simple cases and sets up a clean loader if you plan to hook in external secret stores later.

```python
# secrets/config.py
import os
from typing import Optional, Dict

def load_env_config(prefix: str = "APP") -> Dict[str, Optional[str]]:
    """
    Load config values from environment variables with an optional prefix.
    Example: APP_DB_HOST, APP_DB_PORT, APP_DB_USER, APP_DB_PASSWORD
    """
    cfg = {
        "DB_HOST": os.environ.get(f"{prefix}_DB_HOST"),
        "DB_PORT": os.environ.get(f"{prefix}_DB_PORT", "5432"),
        "DB_USER": os.environ.get(f"{prefix}_DB_USER"),
        "DB_PASSWORD": os.environ.get(f"{prefix}_DB_PASSWORD"),
        "DB_NAME": os.environ.get(f"{prefix}_DB_NAME"),
        "API_KEY": os.environ.get(f"{prefix}_API_KEY"),
    }
    return cfg


def load_config(prefix: str = "APP") -> "AppConfig":
    """
    Strongly-typed config object for the application.
    Note: This demonstrates a simple, type-safe pattern without external libs.
    """
    data = load_env_config(prefix)
    # Basic validation to fail fast if essential values are missing
    missing = [k for k, v in data.items() if v in (None, "") and k != "API_KEY"]
    if missing:
        raise ValueError(f"Missing required config keys: {', '.join(missing)}")
    return AppConfig(
        db_host=data["DB_HOST"],
        db_port=int(data["DB_PORT"]),
        db_user=data["DB_USER"],
        db_password=data["DB_PASSWORD"],
        db_name=data["DB_NAME"],
        api_key=data.get("API_KEY"),
    )


class AppConfig:
    def __init__(
        self,
        db_host: str,
        db_port: int,
        db_user: str,
        db_password: str,
        db_name: str,
        api_key: Optional[str] = None,
    ):
        self.DB_HOST = db_host
        self.DB_PORT = db_port
        self.DB_USER = db_user
        self.DB_PASSWORD = db_password
        self.DB_NAME = db_name
        self.API_KEY = api_key
```

### Line-by-line explanation
- import os, Optional, Dict: Bring in environment access and typing helpers.
- load_env_config(prefix="APP"): Read environment variables with a configurable prefix (e.g., APP_…).
- cfg dict: Collects DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, API_KEY from environment.
- load_config(prefix):
  - Calls load_env_config to obtain raw values.
  - Checks for missing required keys (except API_KEY) and raises if any are absent.
  - Returns a typed AppConfig instance.
- AppConfig class: Simple container for the configuration with clearly named attributes.
- This pattern keeps secrets out of code, supports a consistent interface, and validates presence of required fields early.

## 2. External Secrets Managers: AWS Secrets Manager Example
For production-grade secrets, use an external secret store. AWS Secrets Manager is a common choice. This example shows how to fetch a secret that is stored as a JSON string and convert it to a Python dictionary for use in your app.

```python
# secrets/aws_sm.py
import json
import os
import boto3
from botocore.exceptions import ClientError

def get_secret_value(secret_name: str, region_name: str = None) -> dict:
    region = region_name or os.environ.get("AWS_REGION", "us-east-1")
    client = boto3.client("secretsmanager", region_name=region)
    try:
        get_secret_value_response = client.get_secret_value(SecretId=secret_name)
    except ClientError as e:
        # In production, surface to your error handling/logging layer
        raise e

    secret_string = get_secret_value_response.get("SecretString")
    if secret_string:
        return json.loads(secret_string)
    else:
        # SecretBinary is possible for non-text secrets
        secret_binary = get_secret_value_response.get("SecretBinary")
        if secret_binary:
            return json.loads(secret_binary.decode("utf-8"))
        raise ValueError("SecretString and SecretBinary are both empty")

```

### Line-by-line explanation
- import json, os, boto3, ClientError: Bring in AWS client and JSON handling.
- get_secret_value(secret_name, region_name=None): Define a helper to fetch a secret string from Secrets Manager.
- region selection: Use provided region or default from AWS_REGION env var or default region.
- boto3 client("secretsmanager"): Create a Secrets Manager client.
- get_secret_value: Call AWS API to retrieve the secret by ID.
- Exception handling: Propagate errors for upstream handling (e.g., retry policies, alerting).
- secret_string: If the secret is a JSON string, parse it. If it's binary, decode and parse accordingly.
- Return dict: Expose the secret data as a Python dictionary for convenient access.

Usage example (in your app):
```
# app.py
from secrets.aws_sm import get_secret_value

secrets = get_secret_value("my-app/prod/db")
db_host = secrets["DB_HOST"]
db_password = secrets["DB_PASSWORD"]
```

Notes:
- In production, grant the running service a least-privilege IAM role with Secrets Manager access only to the needed secret(s).
- Consider using secret rotation via AWS Secrets Manager to periodically rotate credentials.

## 3. Configuration Validation and Type Safety
Validating configuration early helps catch misconfigurations before runtime errors cascade. This example uses a lightweight, self-contained approach with a simple data class, and demonstrates parsing a dict from a secrets source (env, AWS Secret) into a strong-typed config object.

```python
# secrets/validation.py
from typing import Optional, Dict
from dataclasses import dataclass

@dataclass
class AppConfig:
    DB_HOST: str
    DB_PORT: int
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str
    API_KEY: Optional[str] = None

def validate_config(raw: Dict[str, str]) -> AppConfig:
    """
    Convert a flat dict (e.g., from env or secret store) into a typed AppConfig.
    """
    # Basic presence checks can be augmented with more sophisticated validation libs
    missing = [k for k in ("DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME") if k not in raw or not raw[k]]
    if missing:
        raise ValueError(f"Missing required config keys: {', '.join(missing)}")

    return AppConfig(
        DB_HOST=raw["DB_HOST"],
        DB_PORT=int(raw["DB_PORT"]),
        DB_USER=raw["DB_USER"],
        DB_PASSWORD=raw["DB_PASSWORD"],
        DB_NAME=raw["DB_NAME"],
        API_KEY=raw.get("API_KEY"),
    )
```

### Line-by-line explanation
- from dataclasses import dataclass: Use a lightweight data container for config.
- @dataclass AppConfig: Define a purely-structured container with typed fields.
- validate_config(raw): Accepts a dictionary and converts to AppConfig.
- Missing keys check: Ensures required fields exist before proceeding.
- Return AppConfig: Provides a strongly-typed object for downstream use.
- This approach keeps type-safety without pulling large validation frameworks, and it integrates cleanly with environments and secret stores.

## 4. Secrets Rotation, Versioning, and Access Patterns
Rotation and versioning minimize exposure time of compromised credentials. Secrets Manager solutions typically offer rotation hooks and version stages (e.g., AWSCURRENT). Here is a minimal pattern for reading the currently active version and triggering rotation via the service, plus a note on best practices.

```python
# secrets/rotation.py
import json
import os
import boto3
from botocore.exceptions import ClientError

def get_current_secret(secret_name: str, region_name: str = None) -> dict:
    region = region_name or os.environ.get("AWS_REGION", "us-east-1")
    client = boto3.client("secretsmanager", region_name=region)
    try:
        resp = client.get_secret_value(SecretId=secret_name, VersionStage="AWSCURRENT")
    except ClientError as e:
        raise e
    secret_string = resp.get("SecretString")
    return json.loads(secret_string) if secret_string else {}
    
def rotate_secret(secret_name: str, region_name: str = None):
    region = region_name or os.environ.get("AWS_REGION", "us-east-1")
    client = boto3.client("secretsmanager", region_name=region)
    # Trigger a rotation; the secret must have a rotation strategy and Lambda configured
    client.rotate_secret(SecretId=secret_name)
```

### Line-by-line explanation
- get_current_secret(...): Fetches the AWSCURRENT version of the secret via Secrets Manager.
- rotate_secret(...): Triggers rotation for the named secret. In practice, you must configure a rotation Lambda behind the secret.
- IAM roles: In production, attach a least-privilege role to the service (or ECS task) so it can read the secret and perform rotations, but not more than necessary.
- This section emphasizes that rotation is a process, not a single API call; automation and policy configuration are required.

## 5. Observability, Auditing, and Access Logging
Security isn’t complete without visibility. Log secret access events and integrate with your observability stack. Ensure logs do not include raw secret values; instead, log which secret was accessed, by which component, and when.

```python
# secrets/audit.py
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

def log_secret_access(component: str, secret_id: str, action: str = "READ"):
    logging.info("Secret access: component=%s secret=%s action=%s", component, secret_id, action)

# usage example
log_secret_access("auth-service", "my-app/prod/db", "READ")
```

### Line-by-line explanation
- logging setup: Establish a centralized logging format for audit events.
- log_secret_access: Emit a structured log line with the component name, secret identifier, and action.
- This approach helps meet audit requirements (e.g., PCI, SOC 2) and enables anomaly detection without leaking secret data.

## 6. Putting It All Together: Secure Config Loader Pattern
A robust, production-ready pattern combines environment loading, external secret retrieval, validation, and observability. The following pattern demonstrates a practical loader flow you can adapt.

```python
# secrets/loader.py
import os
import json
from typing import Dict, Any
import logging

from secrets.aws_sm import get_secret_value
from secrets.config import load_env_config, AppConfig
from secrets.validation import validate_config
from secrets.audit import log_secret_access

def load_config() -> AppConfig:
    """
    Load configuration with a secure, predictable flow:
    1) Try external secrets manager if configured
    2) Fall back to environment variables
    3) Validate and return a strongly-typed config
    """
    secret_name = os.environ.get("SECRET_NAME")
    region = os.environ.get("AWS_REGION")
    data: Dict[str, Any] = {}

    if secret_name:
        try:
            data = get_secret_value(secret_name, region)
            log_secret_access("config-loader", secret_name, "READ")
        except Exception as e:
            logging.warning("SecretsManager unavailable: %s. Falling back to env vars.", e)

    if not data:
        # Fall back to env-based config
        data = load_env_config("APP")

    app_config = validate_config(data)

    return app_config

```

### Line-by-line explanation
- Attempts to load secrets from AWS Secrets Manager if SECRET_NAME is set.
- If Secrets Manager is unavailable or secret retrieval fails, falls back to environment-based config (prefix APP_).
- Validates the loaded data into a typed AppConfig instance for safe downstream use.
- Logs an audit event when secrets are read, and warns if secrets retrieval fails.
- This pattern provides resilience (fallback), security (centralized stores), and observability (audit log).

## X. Common Beginner Mistakes
- Bad: Hard-coding secrets in source code
  - Bad:
    ```
    DB_PASSWORD = "supersecret123"
    API_KEY = "abcdefg12345"
    ```
  - Good:
    ```
    # Do not commit: secrets should come from env or secret manager
    import os
    DB_PASSWORD = os.environ.get("APP_DB_PASSWORD")
    API_KEY = os.environ.get("APP_API_KEY")
    ```
- Bad: Committing secrets to version control (even in private repos)
  - Bad: secrets.json checked into repo
    ```
    {
      "DB_PASSWORD": "password",
      "API_KEY": "key"
    }
    ```
  - Good: add to .gitignore; store in secret store or environment
    - .gitignore:
      ```
      secrets.json
      *.pem
      *.key
      ```
- Bad: Not rotating or planning rotation
  - Bad: keep fixed credentials forever
  - Good: configure Secrets Manager rotation and rotate credentials periodically; update app to fetch latest
- Bad: Printing secrets in logs or responses
  - Bad: logger.info("DB_PASSWORD=%s", DB_PASSWORD)
  - Good: never log sensitive values; log only metadata (e.g., secret name, access events)
- Bad: Trusting an external secret store without access policy
  - Bad: letting any service read any secret
  - Good: enforce least privilege IAM roles; restrict to specific secret ARNs
- Bad: Inconsistent loading strategies across services
  - Good: use a single, documented loader pattern (env-first with override, then secret store)

## Y. Why This Matters In Real Systems
- Security and compliance: Secrets exposure is a top risk; centralizing secrets, rotating them, and auditing access reduces blast radius and helps meet compliance standards (PCI DSS, SOC 2, ISO 27001).
- Reliability and portability: Production systems must work across environments (local, staging, prod) with a consistent config pattern. External secret stores decouple credentials from deployment artifacts, enabling safer CI/CD pipelines.
- Operational efficiency: Rotation, versioning, and access logging enable automated incident response, easier forensics, and smoother on-call shifts.
- Cloud-native alignment: Kubernetes, serverless, and VM-based deployments increasingly rely on secrets integration (KMS, Secrets Manager, Vault). The patterns shown here map directly to those ecosystems and provide a solid foundation for more advanced use cases.

## Z. Study Questions
1. Why is it unsafe to bake credentials directly into application source code?
2. What is a rotation secret, and why is it important for long-lived credentials?
3. How does AWS Secrets Manager versioning (AWSCURRENT, AWSPENDING) help with safe rotation?
4. What are the benefits and drawbacks of using environment variables vs. a dedicated secrets store?
5. What should you log about secret usage to support auditing without exposing secrets?

## Exercise
You will build a small, self-contained secure config loader suitable for a microservice.

Part A: Implement a loader
- Create a Python module that:
  - Tries to fetch secrets from AWS Secrets Manager if SECRET_NAME is set.
  - If Secrets Manager is unavailable, falls back to environment-based config with prefix APP_.
  - Validates that DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME exist.
  - Returns a typed config object (dataclass) with the above fields and an optional API_KEY.

Part B: Add rotation hook (pseudo-implementation)
- Extend the loader to include a function rotate_credentials(secret_name) that triggers a rotation via AWS Secrets Manager (you can call rotate_secret; assume IAM permissions are configured).
- Add a guard that logs a warning if rotation is attempted but the secret does not have rotation configured.

Part C: Auditing
- Integrate simple audit logging to record when a secret is read and from where (Secrets Manager vs environment).

Part D: CLI utility
- Provide a small CLI that prints the loaded configuration keys, but does not print any secret values. It should accept a --show-secrets flag that safely prints a masked version of secrets (e.g., mask passwords).

Part E: Testing considerations
- Outline at least 3 test cases you would write:
  - Test fallback to APP_ env vars when secret store is unavailable.
  - Test validation failure when required fields are missing.
  - Test that rotation is invoked when requested.

Deliverable: Provide the code for Part A (loader), Part B (rotation hook), Part C (audit integration), Part D (CLI), and a short testing plan with example test stubs. Ensure the code is clean, well-documented, and follows the patterns discussed in this lesson.