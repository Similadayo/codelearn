# Bash Scripting for Automation in Kubernetes Platform — Phase 1: Linux & Scripting

Automation is the backbone of modern DevOps and cloud engineering. Bash scripting unlocks repeatable, auditable, and fast workflows for provisioning, deploying, monitoring, and cleaning up resources in a Kubernetes environment. Mastery of Bash in this context helps you build reliable CI/CD steps, perform complex day-2 operations, and bridge human intent with programmable, idempotent actions that scale.

## 1. Bash Essentials for Automation

Code example:

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
ARTIFACTS_DIR="${ARTIFACTS_DIR:-./artifacts}"
mkdir -p "$ARTIFACTS_DIR"
LOG_FILE="$ARTIFACTS_DIR/automation.log"
exec > >(tee -a "$LOG_FILE") 2>&1
echo "[$(date +'%F %T')] Automation harness initialized"
echo "Starting tasks in Kubernetes platform..."
```

### Line-by-line explanation
- #!/usr/bin/env bash
  - Uses the system's bash interpreter for portability across environments.
- set -euo pipefail
  - -e: exit on any non-zero status; -u: treat unset variables as errors; -o pipefail: fail if any part of a pipeline fails.
- IFS=$'\n\t'
  - Sets the internal field separator to newline and tab for safer word-splitting.
- ARTIFACTS_DIR="${ARTIFACTS_DIR:-./artifacts}"
  - Default artifact directory; allows override via environment variable.
- mkdir -p "$ARTIFACTS_DIR"
  - Ensures the directory exists; no error if it already exists.
- LOG_FILE="$ARTIFACTS_DIR/automation.log"
  - Path to a centralized log file for this session.
- exec > >(tee -a "$LOG_FILE") 2>&1
  - Redirects stdout and stderr to a log file while also printing to the console.
- echo "[$(date +'%F %T')] Automation harness initialized"
  - Timestamped log line marking startup.
- echo "Starting tasks in Kubernetes platform..."
  - Simple progress message.

## 2. Variables, Quoting, and Substitution

Code example:

```bash
#!/usr/bin/env bash
set -euo pipefail
NAMESPACE="${NAMESPACE:-default}"
APP="${APP:-myapp}"
IMAGE="${IMAGE:-nginx:latest}"
ENV_VARS="${ENV_VARS:-}"

echo "Preparing deployment for ${APP} in namespace ${NAMESPACE}"
kubectl set image deployment/"${APP}" -n "${NAMESPACE}" "${APP}"="${IMAGE}" --record
```

### Line-by-line explanation
- NAMESPACE="${NAMESPACE:-default}"
  - Uses a default namespace if the environment variable is not set.
- APP="${APP:-myapp}"
  - Sets a default application name; can be overridden via env var.
- IMAGE="${IMAGE:-nginx:latest}"
  - Default container image to deploy/run.
- ENV_VARS="${ENV_VARS:-}"
  - Optional extra environment configuration (not used directly here but ready to extend).
- echo "Preparing deployment for ${APP} in namespace ${NAMESPACE}"
  - Informational output with proper quoting.
- kubectl set image deployment/"${APP}" -n "${NAMESPACE}" "${APP}"="${IMAGE}" --record
  - Updates the deployment’s container image; --record enables a historical rollout note.

## 3. Functions and Modularity

Code example:

```bash
#!/usr/bin/env bash
set -euo pipefail

deploy() {
  local name="${1:-}"
  local ns="${2:-default}"
  local image="${3:-}"
  if [[ -z "$name" ]]; then
    echo "Usage: deploy <name> [namespace] [image]" >&2
    return 1
  fi

  echo "Deploying ${name} in ${ns}"
  if [[ -n "$image" ]]; then
    kubectl set image deployment/"${name}" -n "${ns}" "${name}"="${image}" --record
  fi
  kubectl rollout status deployment/"${name}" -n "${ns}" --timeout=120s
}

# Example usage (may be moved to a caller script or CI/CD step)
APP="${APP:-myapp}"
NAMESPACE="${NAMESPACE:-default}"
IMAGE="${IMAGE:-nginx:latest}"
deploy "$APP" "$NAMESPACE" "$IMAGE"
```

### Line-by-line explanation
- deploy() { ... }
  - Defines a reusable function to perform deployment tasks.
- local name="${1:-}"
  - Reads the first argument as the deployment name; local scope.
- local ns="${2:-default}"
  - Reads the second argument as namespace, defaulting to default.
- local image="${3:-}"
  - Reads the optional image; if not provided, image change is skipped.
- if [[ -z "$name" ]]; then ... fi
  - Basic usage validation; ensures a deployment name is provided.
- echo "Deploying ${name} in ${ns}"
  - Status output for observability.
- kubectl set image deployment/"${name}" -n "${ns}" "${name}"="${image}" --record
  - Updates the deployment image if an image is provided.
- kubectl rollout status deployment/"${name}" -n "${ns}" --timeout=120s
  - Waits for the rollout to complete, providing feedback on success/failure.
- APP="${APP:-myapp}" etc.
  - Demonstrates how to invoke the function with defaults; can be driven by CI/CD.

## 4. Kubernetes Automation with kubectl

Code example:

```bash
#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-default}"
LABEL_SELECTOR="${LABEL_SELECTOR:-app=myapp}"

# Collect pod names in the namespace with the given label
pods=$(kubectl get pods -n "$NAMESPACE" -l "$LABEL_SELECTOR" -o jsonpath='{.items[*].metadata.name}')

echo "Collecting health for pods in namespace '$NAMESPACE' with label '$LABEL_SELECTOR':"
printf "%s\n" $pods

# Show each pod's status and restart counts
for pod in $pods; do
  status=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.status.phase}')
  restarts=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.status.containerStatuses[*].restartCount}')
  echo "Pod: $pod | Status: $status | Restarts: $restarts"
done

# Optional: trigger a rolling restart if any restarts are observed
any_restart=0
for pod in $pods; do
  restart_count=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{range .status.containerStatuses[*]}{.restartCount}{" "}{end}' | awk '{print $1}')
  if [[ "$restart_count" != "" && "$restart_count" -gt 0 ]]; then
    any_restart=1
    break
  fi
done

if [[ "$any_restart" -eq 1 ]]; then
  echo "Detected restarts. Initiating rolling restart for deployments matching label '${LABEL_SELECTOR}'..."
  kubectl rollout restart deployment -n "$NAMESPACE" -l "$LABEL_SELECTOR"
fi
```

### Line-by-line explanation
- NAMESPACE="${NAMESPACE:-default}" and LABEL_SELECTOR="${LABEL_SELECTOR:-app=myapp}"
  - Defaults for namespace and label selector to scope kubectl queries.
- pods=$(kubectl get pods -n "$NAMESPACE" -l "$LABEL_SELECTOR" -o jsonpath='{.items[*].metadata.name}')
  - Fetches the list of pod names matching the label.
- echo "Collecting health ..." and printf
  - Provides user-facing progress output.
- for pod in $pods; do ... done
  - Iterates pods to log status and restart counts; uses jsonpath to extract data.
- status=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.status.phase}')
  - Reads the lifecycle phase (Pending, Running, Succeeded, Failed).
- restarts=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.status.containerStatuses[*].restartCount}')
  - Gets the restart counts for containers in the pod.
- any_restart logic
  - Scans pods to determine if any restarts occurred; sets a flag accordingly.
- kubectl rollout restart deployment -n "$NAMESPACE" -l "$LABEL_SELECTOR"
  - Triggers a rolling restart for deployments matching the label, which is safer and more Kubernetes-native than killing pods directly.

## 5. Error Handling, Logging, and Debugging

Code example:

```bash
#!/usr/bin/env bash
set -euo pipefail
exec > >(tee -a /tmp/automation-debug.log) 2>&1
set -x

NAMESPACE="${NAMESPACE:-default}"
LABEL_SELECTOR="${LABEL_SELECTOR:-app=myapp}"

# Example operation with explicit error handling
if ! kubectl rollout status deployment -n "$NAMESPACE" -l "$LABEL_SELECTOR" --timeout=60s; then
  echo "Rollout not ready; attempting a rollback if possible" >&2
  kubectl rollout undo deployment -n "$NAMESPACE" -l "$LABEL_SELECTOR" || true
fi

echo "Script complete."
```

### Line-by-line explanation
- set -euo pipefail
  - Strong error handling defaults; script exits on errors, variables must be set, pipelines fail on any command failure.
- exec > >(tee -a /tmp/automation-debug.log) 2>&1
  - Centralized, persistent logging for debugging and audits.
- set -x
  - Enables shell tracing to show each command prior to execution. Helpful during development; can be disabled in production.
- if ! kubectl rollout status ... ; then ... fi
  - Waits for a rollout; on failure, attempts a safe rollback.
- kubectl rollout undo deployment -n "$NAMESPACE" -l "$LABEL_SELECTOR"
  - Safe fallback if the rollout is unhealthy; non-fatal if not available.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Not using strict modes
  - Bad:
    ```bash
    #!/usr/bin/env bash
    APP=${APP:-default}
    echo "App: $APP"
    ```
  - Good:
    ```bash
    #!/usr/bin/env bash
    set -euo pipefail
    IFS=$'\n\t'
    APP="${APP:-default}"
    echo "App: ${APP}"
    ```
- Pitfall 2: Unquoted variable expansions causing word splitting
  - Bad:
    ```bash
    NAMES="$NAMES_LIST"
    for n in $NAMES; do
      echo "Name: $n"
    done
    ```
  - Good:
    ```bash
    NAMES_LIST="${NAMES_LIST:-alice bob}"
    IFS=$' \n\t'
    for n in $NAMES_LIST; do
      echo "Name: ${n}"
    done
    ```
- Pitfall 3: Assuming commands always succeed
  - Bad:
    ```bash
    kubectl apply -f manifests/deploy.yaml
    kubectl rollout status deploy/myapp
    ```
  - Good:
    ```bash
    if ! kubectl apply -f manifests/deploy.yaml; then
      echo "Apply failed" >&2
      exit 1
    fi
    if ! kubectl rollout status deploy/myapp; then
      echo "Rollout failed" >&2
      exit 1
    fi
    ```
- Pitfall 4: Not handling spaces in resource names
  - Bad:
    ```bash
    NAME=my app
    kubectl get pod $NAME
    ```
  - Good:
    ```bash
    NAME="my app"
    kubectl get pod "$NAME"
    ```
- Pitfall 5: Over-reliance on kubectl without checks
  - Bad:
    ```bash
    kubectl delete pod my-pod
    kubectl get pod my-pod
    ```
  - Good:
    ```bash
    if kubectl delete pod my-pod; then
      echo "Pod deletion requested"
    else
      echo "Pod not found or cannot be deleted" >&2
      exit 1
    fi
    kubectl get pod my-pod --show-labels || true
    ```

## Y. Why This Matters In Real Systems — production context and real usage

- Reproducibility: Bash scripts in pipelines ensure the same steps run every time, reducing human errors.
- Idempotence: Operations like kubectl rollout restart are designed to be safe for repeated invocations; use them to avoid drift.
- Observability: Centralized logging (log files, stdout, and structured messages) enables post-incident analysis and audit trails.
- Security and secrets: Prefer environment variables, Kubernetes RBAC, and CI/CD secrets managers over embedding credentials in scripts.
- Reliability: Use set -euo pipefail, explicit error handling, and timeouts on kubectl commands to prevent runaway processes.
- Maintainability: Modular scripts with functions improve readability, testability, and reuse across services and clusters.
- Real systems often combine Bash with higher-level tooling (YAML manifests, Helm, Kustomize, CI pipelines). Scripts should be the glue that orchestrates these tools, not the sole mechanism of truth.

## Z. Study Questions — 5 recall questions

1. What does set -euo pipefail do in a Bash script, and why is it important in automation pipelines?
2. How can you perform a rolling restart of a Kubernetes Deployment using kubectl in a Bash script?
3. Why should you quote all variable expansions in Bash, and what problems can occur if you do not?
4. What is idempotence in the context of DevOps scripting, and how can kubectl rollout restart help achieve it?
5. How might you structure a Bash script to log to a file while also streaming output to the console for visibility?

## Exercise — a practical multi-part coding challenge

Part A: Pod status CSV reporter
- Task: Write a Bash script that takes a namespace (-n) and a label selector (-l) and outputs a CSV with columns: Pod,Namespace,Phase,RestartCount.
- Requirements:
  - Use getopts to parse -n and -l.
  - Print a header row: Pod,Namespace,Phase,RestartCount.
  - Collect pods within the given namespace and label and fill in values.
  - Handle pods with multiple containers by aggregating restart counts (sum or show all counts separated by space).
- Starter scaffold:
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail

  usage() { echo "Usage: $0 -n <namespace> -l <label>"; exit 1; }
  NAMESPACE="${NAMESPACE:-default}"
  LABEL="${LABEL:-app=myapp}"
  while getopts "n:l:" opt; do
    case "$opt" in
      n) NAMESPACE="$OPTARG" ;;
      l) LABEL="$OPTARG" ;;
      *) usage ;;
    esac
  done

  echo "Pod,Namespace,Phase,RestartCount"
  pods=$(kubectl get pods -n "$NAMESPACE" -l "$LABEL" -o jsonpath='{.items[*].metadata.name}')
  for pod in $pods; do
    phase=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.status.phase}')
    restarts=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{range .status.containerStatuses[*]}{.restartCount}{" "}{end}')
    echo "$pod,$NAMESPACE,$phase,\"$restarts\""
  done
  ```
- Expected outcomes:
  - A CSV printed to stdout with one line per pod.
  - Works for typical Kubernetes clusters and labeled deployments.

Part B: CrashLoopBackOff detection and auto-rollback
- Extend Part A to detect any pod in CrashLoopBackOff and trigger a rolling restart of deployments with the matching label.
- Hints:
  - Check containerStatuses for state.waiting.reason == CrashLoopBackOff.
  - If detected, execute: kubectl rollout restart deployment -n "$NAMESPACE" -l "$LABEL"
- Optional: add a flag to enable/disable auto-rollback.

Part C: Logging and idempotence
- Extend Part B to write detailed logs to a file under /var/log/bash-automation or a configurable path, with timestamps.
- Add a lock file mechanism to prevent concurrent runs (e.g., using flock).

Part D: Validation in a real cluster
- Run the script against a test namespace with a test deployment.
- Validate that the CSV is generated, a CrashLoopBackOff scenario triggers a rolling restart, and logs are written to the designated file.

If you’d like, I can provide a complete integrated script that combines Parts A–D with a clean CLI and robust error handling.