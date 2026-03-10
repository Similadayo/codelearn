# Bash Scripting for Automation in Azure — Phase 1: Linux & Scripting

Bash scripting is a foundational skill for DevOps engineers working with Azure. It enables you to automate repetitive tasks, implement reproducible environments, and integrate with the Azure CLI to manage resources reliably. In professional environments, well-crafted Bash scripts power ephemeral environments for CI/CD, automate infrastructure provisioning, and serve as glue between tools like GitHub Actions, Azure Pipelines, and Cloud Shell. This lesson focuses on practical Bash patterns tailored for Azure automation, including safe scripting practices, parameterization, error handling, and real-world usage scenarios.

## 1. Bash Basics for Azure Automation

This section covers safe scripting foundations, environment checks, and a first-pass example that creates a resource group and a storage account in Azure.

Code example
```bash
#!/usr/bin/env bash
set -euo pipefail

# Prereq: Azure CLI must be installed and authenticated
command -v az >/dev/null 2>&1 || {
  echo "Azure CLI (az) is required but not installed" >&2
  exit 1
}

# Defaults (can be overridden by args)
RG="${1:-phase1-demo-rg}"
LOCATION="${2:-eastus}"

# Generate a valid, globally unique storage account name (3-24 lowercase alphanumeric)
STORAGE_BASENAME="${RG}-storage-$(date +%s)"
STORAGE_NAME="$(echo "$STORAGE_BASENAME" | tr 'A-Z' 'a-z' | tr -cd 'a-z0-9' | cut -c1-24)"

# Ensure the resource group exists; create if missing
if ! az group show --name "$RG" >/dev/null 2>&1; then
  echo "Creating resource group '$RG' in location '$LOCATION'..."
  az group create --name "$RG" --location "$LOCATION" >/dev/null
else
  echo "Resource group '$RG' already exists."
fi

# Create a storage account (idempotent if already created)
echo "Creating storage account '$STORAGE_NAME' in resource group '$RG'..."
az storage account create --name "$STORAGE_NAME" --resource-group "$RG" --location "$LOCATION" --sku Standard_LRS >/dev/null

echo "Script completed successfully."
```

### Line-by-line explanation
- #!/usr/bin/env bash: Use the user’s Bash interpreter.
- set -euo pipefail: Exit on error, treat unset variables as errors, and fail if any part of a pipeline fails.
- command -v az …: Verify Azure CLI is installed; abort if not.
- RG and LOCATION: Defaults for resource group name and Azure region; can be overridden by positional args.
- STORAGE_BASENAME and STORAGE_NAME: Build a storage account name that is globally unique and compliant (3-24 chars, lowercase letters/numbers).
- az group show: Check if the resource group exists.
- az group create: Create the resource group if it doesn’t exist.
- az storage account create: Create the storage account; using Standard_LRS for a simple, durable option.
- Final echo: Confirm completion.

## 2. Parameterization and Idempotency Patterns

This section shows how to make scripts reusable and safe to re-run, which is essential in CI/CD and automated environments.

Code example
```bash
#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 -n NAME -r RG -l LOCATION" >&2
  echo "  -n NAME       Base name for resources (storage name will be derived)" >&2
  echo "  -r RG         Resource group name" >&2
  echo "  -l LOCATION   Azure location (e.g., eastus)" >&2
  exit 1
}

NAME=""
RG=""
LOCATION=""

while getopts ":n:r:l:" opt; do
  case "$opt" in
    n) NAME="$OPTARG" ;;
    r) RG="$OPTARG" ;;
    l) LOCATION="$OPTARG" ;;
    *) usage ;;
  esac
done

if [[ -z "${NAME}" || -z "${RG}" || -z "${LOCATION}" ]]; then
  usage
fi

# Normalize storage name to be globally unique and valid (3-24 chars)
BASE="${NAME}-storage-$(date +%s)"
STORAGE_NAME="$(echo "$BASE" | tr 'A-Z' 'a-z' | tr -cd 'a-z0-9' | cut -c1-24)"

# Idempotent: create RG if missing
if ! az group show --name "$RG" >/dev/null 2>&1; then
  az group create --name "$RG" --location "$LOCATION" >/dev/null
fi

# Idempotent-ish: storage account creation is safe to run multiple times; name is already normalized
az storage account create --name "$STORAGE_NAME" --resource-group "$RG" --location "$LOCATION" --sku Standard_LRS >/dev/null

echo "Provisioned storage account '$STORAGE_NAME' in RG '$RG' at '$LOCATION'."
```

### Line-by-line explanation
- usage(): Helper to describe required arguments and exit with an error code when needed.
- getopts loop: Parse flags -n, -r, -l for name, resource group, and location.
- Argument validation: Ensure all required arguments are present.
- NAME normalization and STORAGE_NAME derivation: Create a storage name that is compliant and unique.
- az group show / az group create: Idempotently ensure the resource group exists.
- az storage account create: Create the storage account with the derived name in the specified RG/location.
- Final echo: Confirm the operation completed.

## 3. Error Handling and Logging for Production Scripts

In real systems, you need reliable logging, failure insight, and safe cleanup. This section demonstrates structured logging, traps, and a small helper to run commands with error reporting.

Code example
```bash
#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="${LOG_DIR:-/tmp/bash-azure-logs}"
LOG_FILE="$LOG_DIR/azure-script-$(date +%F-%H%M%S).log"
mkdir -p "$LOG_DIR"

log() {
  local level="$1"; shift
  echo "[$(date +'%F %T')] ${level}: $*" >> "$LOG_FILE"
}
info() { log "INFO" "$@"; }
warn() { log "WARN" "$@"; }
error() { log "ERROR" "$@"; }

trap 'error "Script crashed at line $LINENO"; exit 1' ERR
trap 'echo "EXIT" >> "$LOG_FILE"; exit 0' EXIT

ensure_group() {
  local rg="$1" loc="$2"
  if az group exists --name "$rg" >/dev/null 2>&1; then
    info "Resource group '$rg' already exists"
  else
    info "Creating resource group '$rg' in '$loc'"
    az group create --name "$rg" --location "$loc" >/dev/null
  fi
}

RG="${1:-demo-rg}"
LOCATION="${2:-eastus}"
STORAGE_NAME="$(echo "${RG}storage$(date +%s)" | tr 'A-Z' 'a-z' | tr -cd 'a-z0-9' | cut -c1-24)"

ensure_group "$RG" "$LOCATION"
info "Creating storage account '$STORAGE_NAME' in RG '$RG'"
az storage account create --name "$STORAGE_NAME" --resource-group "$RG" --location "$LOCATION" --sku Standard_LRS >/dev/null

info "Script finished successfully."
```

### Line-by-line explanation
- LOG_DIR and LOG_FILE: Define a writable location for logs and a timestamped log file for each run.
- mkdir -p: Ensure the log directory exists.
- log helpers (log, info, warn, error): Centralize log formatting and levels.
- trap ERR: Catch any command failure and log a descriptive error with the line number.
- trap EXIT: Always run cleanup/summary on script exit.
- ensure_group(): Idempotently ensure a resource group exists, with readable logs for decisions.
- RG, LOCATION, STORAGE_NAME: Script parameters and derived resource naming.
- az group create / az storage account create: Core Azure actions with logging.
- Final info: Indicate successful completion.

## 4. Common Beginner Mistakes — 3+ Real Pitfalls (bad vs good)

- Pitfall 1: Not quoting variables (word splitting and globbing)
  - Bad
    ```bash
    RG=$1
    LOCATION=$2
    az group create --name $RG --location $LOCATION
    ```
  - Good
    ```bash
    RG="${1:-default-rg}"
    LOCATION="${2:-eastus}"
    az group create --name "$RG" --location "$LOCATION"
    ```

- Pitfall 2: Failing to use strict mode and robust error handling
  - Bad
    ```bash
    RG="$1"
    az group create --name "$RG" --location "$LOC"
    ```
  - Good
    ```bash
    set -euo pipefail
    RG="${1:-default-rg}"
    LOCATION="${2:-eastus}"
    az group create --name "$RG" --location "$LOCATION"
    ```

- Pitfall 3: Embedding credentials or secrets in the script
  - Bad
    ```bash
    az login --username admin --password 'P4ssw0rd'
    ```
  - Good
    ```bash
    # Use a service principal with environment variables (not hard-coded)
    az login --service-principal -u "$AZ_APP_ID" -p "$AZ_PASSWORD" --tenant "$AZ_TENANT"
    ```
  - Note: Prefer Managed Identity or secret store (Key Vault) where possible.

- Pitfall 4: Assuming commands are idempotent or that failures are non-fatal
  - Bad
    ```bash
    az group create --name "$RG" --location "$LOC"
    # If the RG already exists, this might fail depending on CLI version
    ```
  - Good
    ```bash
    if az group exists --name "$RG" >/dev/null 2>&1; then
      echo "RG exists"
    else
      az group create --name "$RG" --location "$LOC"
    fi
    ```

- Pitfall 5: Not handling JSON output or parsing when needed
  - Bad
    ```bash
    az group show --name "$RG" | grep -q "notfound"
    ```
  - Good
    ```bash
    if az group exists --name "$RG" >/dev/null 2>&1; then
      echo "Exists"
    fi
    ```
  - Best practice: Use CLI commands that return simple, script-friendly results or parse with jq if available.

## 5. Why This Matters In Real Systems

- Reproducibility and consistency: Bash scripts backed by the Azure CLI enable consistent environments across dev, test, and prod, reducing configuration drift.
- Automation at scale: Use scripts in CI/CD pipelines (GitHub Actions, Azure DevOps) to create ephemeral test environments, enforce naming conventions, and tear down resources automatically.
- Idempotency and safety: Proper checks prevent accidental resource duplication and reduce blast radius in disasters or rollback scenarios.
- Observability and auditing: Centralized logging and exit statuses provide traceability for operations, useful for audits and incident response.
- Security best practices: Avoid embedding secrets; prefer managed identities, service principals with scoped permissions, and secret stores like Azure Key Vault. Use environment variables and RBAC to minimize risk.
- Azure-native patterns: Combine Bash with Azure CLI for quick automation, while reserving more complex workflows for IaC (Terraform, Bicep) for maintainability at scale.

## 6. Study Questions — 5 Recall Questions

1. What does set -euo pipefail do, and why is it important in Bash scripting for Cloud automation?
2. How can you ensure an Azure resource group creation is idempotent in a Bash script?
3. Why should you avoid hard-coding credentials in scripts, and what are two recommended approaches to supply credentials securely?
4. What is a simple pattern to implement logging and error reporting in a Bash automation script?
5. Name two Azure CLI commands you would commonly use in a Bash script to verify the existence of a resource group and to create a storage account.

## 7. Exercise — Practical multi-part coding challenge

Goal: Build a robust, reusable Bash script that provisions an Azure Resource Group and a storage account, with logging, idempotency, and optional dry-run.

Part A. Create a script azure-provision.sh that:
- Accepts flags: -n NAME_BASE, -r RG, -l LOCATION
- Generates a compliant storage account name derived from NAME_BASE
- Creates the resource group if it does not exist
- Creates a storage account using the derived name
- Writes all operational messages to a timestamped log file under /tmp/bash-azure-logs
- Uses set -euo pipefail
- Uses a simple logging function (info/warn/error)

Part B. Extend to add a dry-run mode (-d) that prints the actions it would take without executing Azure CLI commands.

Part C. Extend to optionally create a VM after storage account creation:
- If a flag -m VM_NAME is provided, create a basic Ubuntu VM using az vm create with SSH key pair (generate if not present)
- Ensure the VM creation is idempotent (check existence first)

Part D. Provide a quick validation script run sequence:
- Run: ./azure-provision.sh -n mydemo -r mydemo-rg -l eastus
- Then run with dry-run: ./azure-provision.sh -n mydemo -r mydemo-rg -l eastus -d
- Optional: Run with VM creation: ./azure-provision.sh -n mydemo -r mydemo-rg -l eastus -m myvm

Submission checklist:
- The script(s) should be clear, well-commented, and robust against common fail modes.
- Include a short README-style usage outline (embedded in comments or as a small help message) explaining how to run with and without VM creation and with dry-run.
- Ensure the code is portable to common Linux environments with Bash and Azure CLI installed.

If you'd like, I can provide a ready-to-run azure-provision.sh template that implements Parts A–D with clean branching, logging, and dry-run support.