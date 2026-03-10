# Track: DevOps & Cloud Engineering — Module: Phase 1 — Linux & Scripting — Topic: Bash Scripting for Automation (Google Cloud)

Bash scripting is the lingua franca of automation in cloud environments. In Google Cloud, Bash scripts powered by the gcloud CLI and gsutil let you codify operational runbooks, enforce reproducible infrastructure changes, and automate repetitive tasks at scale. This lesson walks you through practical bash scripting patterns tailored for DevOps in Google Cloud, including robust error handling, idempotence, logging, and real-world use cases like VM lifecycle actions and artifact synchronization.

## 1. Bash scripting fundamentals for automation in Google Cloud

Code example: a lightweight bootstrap script that loads a config file, validates required variables, and sets strict execution modes.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Resolve the directory of this script to load config.env reliably
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.env"

log() {
  local level="$1"; shift
  printf "[%s] %s: %s\n" "$(date +'%F %T')" "$level" "$*"
}

# Load config.env if present
if [[ -f "$CONFIG_FILE" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$CONFIG_FILE"
  set +a
else
  log "WARN" "Config file not found: ${CONFIG_FILE}"
fi

# Validate required environment variables
required_vars=(PROJECT_ID REGION)
for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    log "ERROR" "Missing required config variable: $var"
    exit 1
  fi
done

log "INFO" "Loaded config. Project=$PROJECT_ID, Region=$REGION"
```

### Line-by-line explanation
- Line 1: Shebang to use the system's bash.
- Line 2: Enable strict error handling: exit on error, unset variables cause failure, and fail if any part of a pipeline fails.
- Lines 5-7: Compute the script directory to reliably locate config.env alongside the script.
- Lines 9-15: Define a simple log function for consistent output with timestamps.
- Lines 18-23: If config.env exists, export all variables from it into the shell environment.
- Lines 28-36: Ensure required variables PROJECT_ID and REGION are set; log and exit if missing.
- Line 38: Log an informational message confirming loaded values.
- This section demonstrates how to structure a script for reproducibility and safe defaults in a cloud devops context.

## 2. Automating Google Cloud tasks with gcloud and gsutil

Code example: a script that stops and starts Compute Engine instances based on a label, illustrating idempotent, label-driven automation.

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-}"
INSTANCE_LABEL_KEY="auto_manage"
INSTANCE_LABEL_VALUE="true"

if [[ -n "$PROJECT_ID" ]]; then
  gcloud config set project "$PROJECT_ID"
fi

# Stop all RUNNING instances with label auto_manage=true
echo "Stopping instances with label ${INSTANCE_LABEL_KEY}=${INSTANCE_LABEL_VALUE}..."
gcloud compute instances list \
  --filter="labels.${INSTANCE_LABEL_KEY}=${INSTANCE_LABEL_VALUE} AND status:RUNNING" \
  --format="csv(name,zone)" \
  | tail -n +2 | \
  while IFS=',' read -r NAME ZONE; do
      NAME="${NAME// /}"  # trim spaces
      ZONE="${ZONE// /}"
      if [[ -n "$NAME" && -n "$ZONE" ]]; then
        echo "Stopping $NAME in $ZONE"
        gcloud compute instances stop "$NAME" --zone="$ZONE" --quiet
      fi
  done

# Start all TERMINATED instances with label auto_manage=true
echo "Starting instances with label ${INSTANCE_LABEL_KEY}=${INSTANCE_LABEL_VALUE}..."
gcloud compute instances list \
  --filter="labels.${INSTANCE_LABEL_KEY}=${INSTANCE_LABEL_VALUE} AND status:TERMINATED" \
  --format="csv(name,zone)" \
  | tail -n +2 | \
  while IFS=',' read -r NAME ZONE; do
      NAME="${NAME// /}"
      ZONE="${ZONE// /}"
      if [[ -n "$NAME" && -n "$ZONE" ]]; then
        echo "Starting $NAME in $ZONE"
        gcloud compute instances start "$NAME" --zone="$ZONE" --quiet
      fi
  done
```

### Line-by-line explanation
- Lines 1-3: Standard header and strict mode.
- Line 5-7: Pull PROJECT_ID and REGION from the environment; defaults empty if not set.
- Lines 9-12: If a project is provided, configure gcloud to use it.
- Lines 15-22: List RUNNING instances with a specific label, format as CSV, skip header, and loop over each line.
- Lines 24-28: Inside loop, trim whitespace, validate NAME and ZONE, then stop the instance using gcloud.
- Lines 31-38: List TERMINATED instances with the same label, loop similarly, and start the instance.
- This pattern uses labels to drive lifecycle actions, making changes idempotent and auditable.

## 3. Error handling, idempotence, and logging for production-grade scripts

Code example: a robust, reusable utility script that adds retry, dry-run, and structured logging, suitable for Cloud operations.

```bash
#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="${LOG_DIR:-/var/log/bash-automation}"
LOG_FILE="$LOG_DIR/automation.log"
DRY_RUN="${DRY_RUN:-}"
mkdir -p "$LOG_DIR"

log() {
  local level="$1"; shift
  printf "[%s] %s: %s\n" "$(date +'%F %T')" "$level" "$*"
}

exec_and_log() {
  local cmd="$1"
  if [[ -n "${DRY_RUN}" ]]; then
    log "INFO" "Dry-run: $cmd"
  else
    log "INFO" "EXEC: $cmd"
    eval "$cmd"
  fi
}

trap 'log "ERROR" "Script failed at line $LINENO"; exit 1' ERR

retry() {
  local -r n="${1:-3}"; shift
  local i=0
  until [ "$i" -ge "$n" ]; do
    if eval "$@"; then
      return 0
    else
      i=$((i+1))
      sleep $((i * 2))
    fi
  done
  return 1
}

SRC_DIR="${SRC_DIR:-./build}"
DST_DIR="${DST_DIR:-gs://my-bucket/artifacts}"

retry 3 gsutil -m rsync -r "$SRC_DIR" "$DST_DIR" && log "INFO" "Sync complete" || { log "ERROR" "Sync failed"; exit 1; }
```

### Line-by-line explanation
- Lines 1-4: Shebang and strict mode; define logging and directories.
- Line 6: log function to standardize log output with timestamps.
- Lines 9-14: exec_and_log helper prints what would run in dry-run mode or executes the command and logs it.
- Line 16: Set a trap so any error logs an error message with the line number.
- Lines 18-26: retry helper attempts a command up to n times with exponential backoff; returns success or failure.
- Lines 28-29: Define source and destination for artifact synchronization.
- Lines 31-34: Use retry to perform a robust, retriable sync; log on success or error.

## 4. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code

### 4.1 Pitfall: Forgetting to enable strict mode
Bad:
```bash
#!/bin/bash
echo "Starting..."
VAR=${1}
```

Good:
```bash
#!/usr/bin/env bash
set -euo pipefail
VAR="${1}"
```

### 4.2 Pitfall: Word splitting and unquoted variables
Bad:
```bash
FILES=$HOME/*
for f in $FILES; do
  echo "$f"
done
```

Good:
```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
for f in "$HOME"/*; do
  echo "$f"
done
```

### 4.3 Pitfall: Not handling spaces in file names or data
Bad:
```bash
gcloud compute instances list --format="csv(name,zone)" | while read NAME ZONE; do
  echo "$NAME in $ZONE"
done
```

Good:
```bash
#!/usr/bin/env bash
set -euo pipefail
gcloud compute instances list --format="csv(name,zone)" \
  | while IFS=',' read -r NAME ZONE; do
      NAME="${NAME// /}"
      ZONE="${ZONE// /}"
      echo "$NAME in $ZONE"
    done
```

### 4.4 Pitfall: Ignoring errors from external commands
Bad:
```bash
gsutil rsync -r ./build gs://my-bucket/artifacts
```

Good:
```bash
#!/usr/bin/env bash
set -euo pipefail
if ! gsutil rsync -r ./build gs://my-bucket/artifacts; then
  echo "Rsync failed" >&2
  exit 1
fi
```

### 4.5 Pitfall: Hard-coding credentials or secrets
Bad:
```bash
#!/usr/bin/env bash
export GCP_SERVICE_ACCOUNT_KEY="-----BEGIN...END-----"
```

Good:
```bash
#!/usr/bin/env bash
set -euo pipefail
# Use Cloud IAM credentials securely
gcloud auth activate-service-account --key-file "${SA_KEY_FILE:?Need SA key file}"
```

## 5. Why This Matters In Real Systems — production context and real usage

- Reproducibility and auditability: Scripts ensure every run is repeatable with the same inputs, making deployments and maintenance auditable.
- Idempotence: Label-driven and status-aware operations (start/stop, deploys) prevent drift and accidental resource duplication.
- Safety and reliability: Strict Bash modes, logging, dry-run options, and retry loops reduce the blast radius of failures and provide clear runbooks for ops teams.
- Cloud integration: In Google Cloud, Bash scripts are commonly used in startup scripts, CI/CD hooks, Cloud Scheduler-backed tasks, and as glue between gsutil, gcloud, and APIs. They enable automations such as scheduled VM maintenance, artifact promotion, and environment provisioning without heavy tooling.
- Security considerations: Prefer service accounts over user credentials; centralize secrets in Secret Manager; restrict script permissions; validate inputs; and avoid embedding long-lived keys in code.
- Operational patterns: Use Cloud Scheduler or Cloud Functions to trigger Bash-driven workflows; integrate with Cloud Build or GitHub Actions for CI/CD; ensure logs route to Cloud Logging for observability.

## 6. Study Questions — 5 recall questions

1) What Bash option ensures the script exits if an undefined variable is used?  
2) How can you make a script safely retry an operation (e.g., a transient network error) in Bash?  
3) Why is it important to quote variables in loops when iterating over file lists or command outputs?  
4) How would you stop and start Google Compute Engine instances automatically using a Bash script? Mention a key CLI flag that makes actions non-interactive.  
5) What are some best practices for handling secrets when scripting against Google Cloud APIs?

## 7. Exercise — a practical multi-part coding challenge

Goal: Build a small Bash automation toolkit that loads a config, manages Compute Engine instances by label, and pushes artifacts to Cloud Storage with robust safety nets.

Part A — Config loader
- Create a config.env alongside your script with at least:
  - PROJECT_ID
  - REGION
  - BUCKET (for artifact uploads)
  - LABEL_KEY and LABEL_VALUE to drive instance selection

Part B — Basic lifecycle script
- Write a script named manage-instances.sh that:
  - Loads config.env
  - Sets the gcloud project
  - Stops all RUNNING instances labeled with LABEL_KEY=LABEL_VALUE
  - Starts all TERMINATED instances with the same label
  - Logs actions to stdout

Part C — Artifact sync with dry-run option
- Extend the script to accept a DRY_RUN flag (export DRY_RUN=1 to enable).
- Implement a function that rsyncs a local build directory to gs://$BUCKET/artifacts with a retry mechanism.
- If DRY_RUN is set, print the commands without executing them.

Part D — Robustness and logging
- Add a log function with timestamps (in a dedicated log file in /var/log or a local ./logs directory).
- Add a trap to catch errors and dump the last action attempted.
- Include a simple retry mechanism for the rsync.

Part E — Usage and validation
- Provide a readme-style usage snippet showing how to run:
  - ./manage-instances.sh
  - DRY_RUN=1 ./manage-instances.sh
- Validate behavior by inspecting logs and ensuring no resource is left in an unexpected state.

Starter code you can adapt (optional):

config.env (example)
PROJECT_ID=your-gcp-project
REGION=us-central1
BUCKET=your-artifacts-bucket
LABEL_KEY=auto_manage
LABEL_VALUE=true

manage-instances.sh (starter)
```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.env"

if [[ -f "$CONFIG_FILE" ]]; then
  set -a
  source "$CONFIG_FILE"
  set +a
else
  echo "Config not found: $CONFIG_FILE" >&2
  exit 1
fi

gcloud config set project "${PROJECT_ID}"

# Stop RUNNING instances
gcloud compute instances list \
  --filter="labels.${LABEL_KEY}=${LABEL_VALUE} AND status:RUNNING" \
  --format="csv(name,zone)" \
  | tail -n +2 | while IFS=',' read -r NAME ZONE; do
      NAME="${NAME// /}"
      ZONE="${ZONE// /}"
      echo "Stopping $NAME in $ZONE"
      gcloud compute instances stop "$NAME" --zone="$ZONE" --quiet
    done

# Start TERMINATED instances
gcloud compute instances list \
  --filter="labels.${LABEL_KEY}=${LABEL_VALUE} AND status:TERMINATED" \
  --format="csv(name,zone)" \
  | tail -n +2 | while IFS=',' read -r NAME ZONE; do
      NAME="${NAME// /}"
      ZONE="${ZONE// /}"
      echo "Starting $NAME in $ZONE"
      gcloud compute instances start "$NAME" --zone="$ZONE" --quiet
    done

# Optional: artifact sync (to be extended with DRY_RUN and retry)
SRC_DIR="${SCRIPT_DIR}/build"
DST_DIR="gs://${BUCKET}/artifacts"
if [[ -d "$SRC_DIR" ]]; then
  echo "Syncing artifacts from $SRC_DIR to $DST_DIR"
  gsutil -m rsync -r "$SRC_DIR" "$DST_DIR"
fi
```

What you should submit or demonstrate:
- A working config.env with valid values (or placeholders you can replace).
- A Bash script that loads the config, manages instances by label, and can optionally perform a dry-run of the artifact sync.
- A short README-style usage section explaining how to run in both normal and dry-run modes.

Notes:
- In real environments, prefer service accounts with least privilege for automation.
- For secrets, avoid embedding in scripts; use Secret Manager and environment-driven configuration.
- Test scripts in a non-production project or on non-critical resources to validate behavior.